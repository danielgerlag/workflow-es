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

    public usePersistence(provider: IPersistenceProvider) {
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
        this.registerCleanCallbacks();
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
    
    public async startWorkflow(id: string, version: number, data: any = {}): Promise<string> {
        var self = this;        
            
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
        
        var workflowId = await self.persistence.createNewWorkflow(wf);
        self.queueProvider.queueForProcessing(workflowId);

        return workflowId;
    }
    
    
    public registerWorkflow<TData>(workflow: WorkflowBase<TData>) {
        this.registry.registerWorkflow<TData>(workflow);
    }

    public async subscribeEvent(workflowId: string, stepId: number, eventName: string, eventKey: any): Promise<void> {
        var self = this;        
        self.logger.info("Subscribing to event %s %s for workflow %s step %s", eventName, eventKey, workflowId, stepId);
        var sub = new EventSubscription();
        sub.workflowId = workflowId;
        sub.stepId = stepId;
        sub.eventName = eventName;
        sub.eventKey = eventKey;
        await self.persistence.createEventSubscription(sub);    
    }

    public async publishEvent(eventName: string, eventKey: string, eventData: any): Promise<void> {
        var self = this;
        //todo: check host status        
    
        self.logger.info("Publishing event %s %s", eventName, eventKey);
        var subs = await self.persistence.getSubscriptions(eventName, eventKey);

        var deferredPubs = [];
        for (let sub of subs) {
            var pub = new EventPublication();
            pub.id = (Math.random() * 0x10000000000000).toString(16);
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
        await Promise.all(deferredPubs);
    }

    public async suspendWorkflow(id: string): Promise<boolean> {
        var self = this;
        try {        
            var result = false;
            var gotLock = await self.lockProvider.aquireLock(id);
            
            if (gotLock) {              
                try {
                    var wf = await self.persistence.getWorkflowInstance(id);
                    if (wf.status == WorkflowStatus.Runnable) {
                        wf.status = WorkflowStatus.Suspended;
                        await self.persistence.persistWorkflow(wf);
                        result = true;
                    }
                }   
                finally {
                    self.lockProvider.releaseLock(id);
                }            
            }
            return result;
        }
        catch (err) {
            self.logger.error("Error suspending workflow: " + err);
            return false;
        }
    }

    public async resumeWorkflow(id: string): Promise<boolean> {
        var self = this;
        try {        
            var result = false;
            var gotLock = await self.lockProvider.aquireLock(id);
            
            if (gotLock) {              
                try {
                    var wf = await self.persistence.getWorkflowInstance(id);
                    if (wf.status == WorkflowStatus.Suspended) {
                        wf.status = WorkflowStatus.Runnable;
                        await self.persistence.persistWorkflow(wf);
                        result = true;
                    }
                }   
                finally {
                    self.lockProvider.releaseLock(id);
                }            
            }
            return result;
        }
        catch (err) {
            self.logger.error("Error resuming workflow: " + err);
            return false;
        }
    }

    public async terminateWorkflow(id: string): Promise<boolean> {
        var self = this;
        try {        
            var result = false;
            var gotLock = await self.lockProvider.aquireLock(id);
            
            if (gotLock) {              
                try {
                    var wf = await self.persistence.getWorkflowInstance(id);                    
                    wf.status = WorkflowStatus.Terminated;
                    await self.persistence.persistWorkflow(wf);
                    result = true;                    
                }   
                finally {
                    self.lockProvider.releaseLock(id);
                }            
            }
            return result;
        }
        catch (err) {
            self.logger.error("Error terminating workflow: " + err);
            return false;
        }
    }

    private async processWorkflowQueue(host: WorkflowHost): Promise<void> {                
        try {
            var workflowId = await host.queueProvider.dequeueForProcessing();
            while (workflowId) {
                host.logger.log("Dequeued workflow " + workflowId + " for processing");
                host.processWorkflow(host, workflowId)
                    .catch((err) => {
                        host.logger.error("Error processing workflow", workflowId, err);
                    });
                workflowId = await host.queueProvider.dequeueForProcessing();
            }
        }
        catch (err) {
            host.logger.error("Error processing workflow queue: " + err);
        }            
    }

    private async processWorkflow(host: WorkflowHost, workflowId: string): Promise<void> {
        try {
            var gotLock = await host.lockProvider.aquireLock(workflowId);                
            if (gotLock) {
                var complete = false;
                try {
                    var instance: WorkflowInstance = await host.persistence.getWorkflowInstance(workflowId);                        
                    if (instance.status == WorkflowStatus.Runnable) {
                        await host.executor.execute(instance);
                        complete = true;
                    }                    
                }
                finally {
                    await host.lockProvider.releaseLock(workflowId);
                    if (complete) {
                        if ((instance.status == WorkflowStatus.Runnable) && (instance.nextExecution !== null)) {
                            if (instance.nextExecution < Date.now()) {                                
                                host.queueProvider.queueForProcessing(workflowId);
                            }
                        }
                    }
                }                
            }
            else {
                host.logger.log("Workflow locked: " + workflowId);
            }   
        }
        catch (err) {
            host.logger.error("Error processing workflow: " + err);
        }
    }

    private async processPublicationQueue(host: WorkflowHost): Promise<void> {
        try {
            var pub = await host.queueProvider.dequeueForPublish();
            while (pub) {
                host.processPublication(host, pub)
                    .catch((err) => {
                        host.logger.error(err);
                        host.persistence.createUnpublishedEvent(pub);
                    });
                pub = await host.queueProvider.dequeueForPublish();
            }                 
        }
        catch (err) {
            host.logger.error("Error processing publication queue: " + err);
        }        
    } 

    private async processPublication(host: WorkflowHost, pub: EventPublication): Promise<void> {
        try {
            host.logger.log("Publishing event " + pub.eventName + " for " + pub.workflowId);
            var gotLock = await host.lockProvider.aquireLock(pub.workflowId);            
            if (gotLock) {
                try {
                    var instance = await host.persistence.getWorkflowInstance(pub.workflowId);                
                    var pointers = instance.executionPointers.filter(ep => ep.eventName == pub.eventName && ep.eventKey == pub.eventKey && !ep.eventPublished);
                    for (let p of pointers) {
                        p.eventData = pub.eventData;
                        p.eventPublished = true;
                        p.active = true;
                    }
                    instance.nextExecution = 0;
                    await host.persistence.persistWorkflow(instance);
                        
                    host.logger.log("Published event " + pub.eventName + " for " + pub.workflowId);
                }
                finally {
                    await host.lockProvider.releaseLock(pub.workflowId);
                    await host.queueProvider.queueForProcessing(pub.workflowId);
                }       
            }
            else {
                host.logger.info("Workflow locked " + pub.workflowId);
            }
        }
        catch (err) {
            host.logger.error("Error processing publication: " + err);
        }        
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

    private async stashUnpublishedEvents() {
        var self = this;        
        var pub = await self.queueProvider.dequeueForPublish()
        while (pub) {
            await self.persistence.createUnpublishedEvent(pub);
            pub = await self.queueProvider.dequeueForPublish();
        }           
    }

    private registerCleanCallbacks() {
        var self = this;

        if (typeof process !== 'undefined' && process) {
            process.on('SIGINT', () => {
                self.stop();
            });
        }

        // if (typeof window !== 'undefined' && window) {
        //     window.addEventListener('beforeunload', function(event) {
        //         self.stop();
        //     });
        // }
    }

}