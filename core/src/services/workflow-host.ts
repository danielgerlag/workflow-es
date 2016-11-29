import { Promise } from "es6-promise";

import { WorkflowInstance, WorkflowStatus, ExecutionPointer, EventSubscription, EventPublication } from "../models";
import { WorkflowBase, IPersistenceProvider, IWorkflowHost, IQueueProvider, IDistributedLockProvider, IWorkflowExecutor, ILogger } from "../abstractions";
import { WorkflowRegistry } from "./workflow-registry";
import { WorkflowExecutor } from "./workflow-executor";

import { MemoryPersistenceProvider } from "./memory-persistence-provider";
import { SingleNodeLockProvider } from "./single-node-lock-provider";
import { SingleNodeQueueProvider } from "./single-node-queue-provider";
import { NullLogger } from "./null-logger";

export class WorkflowHost implements IWorkflowHost {

    private registry : WorkflowRegistry = new WorkflowRegistry();

    private persistence: IPersistenceProvider = new MemoryPersistenceProvider();
    private lockProvider: IDistributedLockProvider = new SingleNodeLockProvider();
    private queueProvider:  IQueueProvider = new SingleNodeQueueProvider();
    private executor: IWorkflowExecutor;
    private logger: ILogger = new NullLogger();
    private processTimer: any;
    private publishTimer: any;
    private pollTimer: any;

    constructor() {        
        
    }

    public usePersisence(provider: IPersistenceProvider) {
        this.persistence = provider;
    }

    public useLogger(logger: ILogger) {
        this.logger = logger;
    }

    public start(): Promise<void> {
        this.logger.log("Starting workflow host...");
        this.executor = new WorkflowExecutor(this, this.persistence, this.registry, this.logger);
        this.processTimer = setInterval(this.processWorkflowQueue, 500, this);
        this.pollTimer = setInterval(this.pollRunnables, 10000, this);
        this.publishTimer = setInterval(this.processPublicationQueue, 1000, this);
        return Promise.resolve(undefined);
    }

    public stop() {
        this.logger.log("Stopping workflow host...");
        this.stashUnpublishedEvents();
        if (this.processTimer)
            clearInterval(this.processTimer);
        
        if (this.pollTimer)
            clearInterval(this.pollTimer);

        if (this.publishTimer)
            clearInterval(this.publishTimer);
    }
    
    public startWorkflow(id: string, version: number, data: any = {}): Promise<string> {
        var self = this;
        var deferred = new Promise<string>((resolve, reject) => {
            
            var def = self.registry.getDefinition(id, version);
            var wf = new WorkflowInstance();
            wf.data = data;
            wf.description = def.description;
            wf.workflowDefinitionId = def.id;
            wf.version = def.version;
            wf.nextExecution = 0;
            wf.status = WorkflowStatus.Runnable;
            
            var ep = new ExecutionPointer();
            ep.active = true;
            ep.stepId = def.initialStep;
            ep.concurrentFork = 1;
            wf.executionPointers.push(ep);
            
            self.persistence.createNewWorkflow(wf)
                .then((workflowId) => {
                    self.queueProvider.queueForProcessing(workflowId);
                    resolve(workflowId);
                })
                .catch((error) => {
                    reject(error);
                });            
        });
        return deferred;
    }
    
    
    public registerWorkflow<TData>(workflow: WorkflowBase<TData>) {
        this.registry.registerWorkflow<TData>(workflow);
    }

    public subscribeEvent(workflowId: string, stepId: number, eventName: string, eventKey: string): Promise<void> {
        var self = this;
        var deferred = new Promise<void>((resolve, reject) => {
            self.logger.info("Subscribing to event %s %s for workflow %s step %s", eventName, eventKey, workflowId, stepId);
            var sub = new EventSubscription();
            sub.workflowId = workflowId;
            sub.stepId = stepId;
            sub.eventName = eventName;
            sub.eventKey = eventKey;
            self.persistence.createEventSubscription(sub)
                .then(() => {
                    resolve();
                })
                .catch(err => reject(err));
        });
        return deferred;
    }

    public publishEvent(eventName: string, eventKey: string, eventData: any): Promise<void> {
        var self = this;
        var deferred = new Promise<void>((resolve, reject) => {
            //todo: check host status        
            var uuid = require("uuid");
            self.logger.info("Publishing event %s %s", eventName, eventKey);
            self.persistence.getSubscriptions(eventName, eventKey)
                .then((subs) => {
                    var deferredPubs = []
                    for (let sub of subs) {
                        var pub = new EventPublication();
                        pub.id = uuid();
                        pub.eventData = eventData;
                        pub.eventKey = eventKey;
                        pub.eventName = eventName;
                        pub.stepId = sub.stepId;
                        pub.workflowId = sub.workflowId;
                        
                        deferredPubs.push(new Promise((resolvePub, rejectPub) => {
                            self.queueProvider.queueForPublish(pub)
                                .then(() => {
                                    self.persistence.terminateSubscription(sub.id)
                                        .then(() => {
                                            resolvePub();
                                        });
                                })
                                .catch((err) => {
                                    self.persistence.createUnpublishedEvent(pub)
                                        .then(() => {
                                            self.persistence.terminateSubscription(sub.id)
                                                .then(() => {
                                                    resolvePub();
                                                });
                                        });
                                });
                        }));
                    }
                    Promise.all(deferredPubs)
                        .then(() => {
                            resolve();
                        })
                        .catch((err) => {
                            reject(err);
                        });
                    
                })
                .catch((err) => {
                    reject(err);
                });
            
        });        
        return deferred;
    }

    public suspendWorkflow(id: string): Promise<boolean> {
        var self = this;
        var deferred = new Promise<boolean>((resolve, reject) => {
            self.lockProvider.aquireLock(id)
                .then(gotLock  => {
                    if (gotLock) {                        
                        self.persistence.getWorkflowInstance(id)
                            .then((wf) => {
                                if (wf.status == WorkflowStatus.Runnable) {
                                    wf.status = WorkflowStatus.Suspended;
                                    self.persistence.persistWorkflow(wf)
                                        .then(() => {
                                            self.lockProvider.releaseLock(id);
                                            resolve(true);
                                        })
                                        .catch(err => {
                                            self.lockProvider.releaseLock(id);
                                            reject(err)
                                        });
                                }
                                else
                                    self.lockProvider.releaseLock(id);
                            })
                            .catch(err => {
                                self.lockProvider.releaseLock(id);
                                reject(err);
                            });
                    }
                });
            
            resolve(false);    
        });
        return deferred;        
    }

    public resumeWorkflow(id: string): Promise<boolean> {
        var self = this;
        var deferred = new Promise<boolean>((resolve, reject) => {
            self.lockProvider.aquireLock(id)
                .then(gotLock  => {
                    if (gotLock) {                        
                        self.persistence.getWorkflowInstance(id)
                            .then((wf) => {
                                if (wf.status == WorkflowStatus.Suspended) {
                                    wf.status = WorkflowStatus.Runnable;
                                    self.persistence.persistWorkflow(wf)
                                        .then(() => {
                                            self.lockProvider.releaseLock(id);
                                            resolve(true);
                                        })
                                        .catch(err => {
                                            self.lockProvider.releaseLock(id);
                                            reject(err)
                                        });
                                }
                                else
                                    self.lockProvider.releaseLock(id);
                            })
                            .catch(err => {
                                self.lockProvider.releaseLock(id);
                                reject(err);
                            });
                    }
                });
            
            resolve(false);    
        });
        return deferred;
    }

    public terminateWorkflow(id: string): Promise<boolean> {
        var self = this;
        var deferred = new Promise<boolean>((resolve, reject) => {
            self.lockProvider.aquireLock(id)
                .then(gotLock  => {
                    if (gotLock) {                        
                        self.persistence.getWorkflowInstance(id)
                            .then((wf) => {                                
                                wf.status = WorkflowStatus.Terminated;
                                self.persistence.persistWorkflow(wf)
                                    .then(() => {
                                        self.lockProvider.releaseLock(id);
                                        resolve(true);
                                    })
                                    .catch(err => {
                                        self.lockProvider.releaseLock(id);
                                        reject(err)
                                    });                            
                            })
                            .catch(err => {
                                self.lockProvider.releaseLock(id);
                                reject(err);
                            });
                    }
                });
            
            resolve(false);    
        });
        return deferred;
    }

    private processWorkflowQueue(host: WorkflowHost): Promise<void> {                
        var deferred = new Promise<void>((resolve, reject) => {
            host.queueProvider.dequeueForProcessing()
                .then(workflowId => {
                    if (workflowId) {
                        host.logger.log("Dequeued workflow " + workflowId + " for processing");
                        host.processWorkflow(host, workflowId)
                            .catch((err) => {
                                host.logger.error("Error processing workflow", workflowId, err);
                            });
                        host.processWorkflowQueue(host);
                    }
                });
            resolve();
        });
        return deferred;        
    }

    private processWorkflow(host: WorkflowHost, workflowId: string): Promise<void> {
        var deferred = new Promise<void>((resolve, reject) => {
            host.lockProvider.aquireLock(workflowId)
                .then(gotLock => {
                    if (gotLock) {                    
                        var instance: WorkflowInstance = null;
                        host.persistence.getWorkflowInstance(workflowId)
                            .then((instance) => {
                                if (instance.status == WorkflowStatus.Runnable) {
                                    host.executor.Execute(instance)
                                        .then(() => {
                                            host.lockProvider.releaseLock(workflowId);
                                            if ((instance.status == WorkflowStatus.Runnable) && (instance.nextExecution !== null)) {
                                                if (instance.nextExecution < Date.now()) {
                                                    //host.logger.log("requeue");
                                                    host.queueProvider.queueForProcessing(workflowId);
                                                }
                                            }
                                        })
                                        .catch(err => {
                                            host.lockProvider.releaseLock(workflowId);
                                            reject(err);
                                        });
                                }
                            })
                            .catch(err => {
                                host.lockProvider.releaseLock(workflowId);
                                reject(err);
                            });
                    }
                    else {
                        host.logger.log("Workflow locked: " + workflowId);
                    }
                    resolve();
                })
                .catch(err => reject(err));
        });        
        return deferred;
    }

    private processPublicationQueue(host: WorkflowHost): Promise<void> {
        var deferred = new Promise<void>((resolve, reject) => {
            host.queueProvider.dequeueForPublish()
                .then(pub => {
                    if (pub) {
                        host.processPublication(host, pub)
                            .catch((err) => {
                                host.logger.error(err);
                                host.persistence.createUnpublishedEvent(pub);
                            });
                        host.processPublicationQueue(host);
                    }
                });
            resolve();
        });
        return deferred;
    } 

    private processPublication(host: WorkflowHost, pub: EventPublication): Promise<void> {
        var deferred = new Promise<void>((resolve, reject) => {
            host.logger.log("Publishing event " + pub.eventName + " for " + pub.workflowId);
            host.lockProvider.aquireLock(pub.workflowId)
                .then(gotLock => {
                    if (gotLock) {
                        host.persistence.getWorkflowInstance(pub.workflowId)
                            .then((instance) => {
                                var pointers = instance.executionPointers.filter(ep => ep.eventName == pub.eventName && ep.eventKey == pub.eventKey && !ep.eventPublished);
                                for (let p of pointers) {
                                    p.eventData = pub.eventData;
                                    p.eventPublished = true;
                                    p.active = true;
                                }
                                instance.nextExecution = 0;
                                host.persistence.persistWorkflow(instance)
                                    .then(() => {
                                        host.logger.log("Published event " + pub.eventName + " for " + pub.workflowId);
                                        host.lockProvider.releaseLock(pub.workflowId)
                                            .then(() => {
                                                host.queueProvider.queueForProcessing(pub.workflowId);
                                            });
                                    })
                                    .catch(err => {
                                        host.lockProvider.releaseLock(pub.workflowId);
                                        reject(err);
                                    });
                            })
                            .catch(err => {
                                host.lockProvider.releaseLock(pub.workflowId);
                                reject(err);
                            });                
                    }
                    else {
                        host.logger.info("Workflow locked " + pub.workflowId);
                    }
                    resolve();
                });
        });
        return deferred;
    }


    private pollRunnables(host: WorkflowHost) {
        host.logger.info("pollRunnables " + " - now = " + Date.now());
        host.persistence.getRunnableInstances()
            .then((runnables) => {                
                for (let item of runnables) {                    
                    host.queueProvider.queueForProcessing(item);
                }
            })
            .catch(err => host.logger.error(err));
    }

    private stashUnpublishedEvents() {
        var self = this;
        var deferred = new Promise<void>((resolve, reject) => {
            self.queueProvider.dequeueForPublish()
                .then(pub => {
                    if (pub) {
                        self.persistence.createUnpublishedEvent(pub);
                        self.stashUnpublishedEvents();
                    }
                });
            resolve();
        });
        return deferred;        
    }

}