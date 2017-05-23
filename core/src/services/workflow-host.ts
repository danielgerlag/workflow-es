import { injectable, inject, multiInject } from "inversify";
import { WorkflowInstance, WorkflowStatus, ExecutionPointer, EventSubscription, EventPublication } from "../models";
import { WorkflowBase, IPersistenceProvider, IWorkflowHost, IQueueProvider, QueueType, IDistributedLockProvider, IBackgroundWorker, TYPES, ILogger } from "../abstractions";
import { WorkflowRegistry } from "./workflow-registry";
import { WorkflowQueueWorker } from "./workflow-queue-worker";

import { MemoryPersistenceProvider } from "./memory-persistence-provider";
import { SingleNodeLockProvider } from "./single-node-lock-provider";
import { SingleNodeQueueProvider } from "./single-node-queue-provider";
import { NullLogger } from "./null-logger";

@injectable()
export class WorkflowHost implements IWorkflowHost {

    @inject(WorkflowRegistry)
    private registry : WorkflowRegistry;

    @multiInject(TYPES.IBackgroundWorker)
    private workers: IBackgroundWorker[];

    @inject(TYPES.IPersistenceProvider)
    private persistence: IPersistenceProvider;

    @inject(TYPES.IDistributedLockProvider)
    private lockProvider: IDistributedLockProvider;
    
    @inject(TYPES.IQueueProvider)
    private queueProvider:  IQueueProvider = new SingleNodeQueueProvider();

    @inject(TYPES.ILogger)
    private logger: ILogger;
    
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
        for (let worker of this.workers) {
            worker.start();
        }
        
        this.pollTimer = setInterval(this.pollRunnables, 10000, this);
        this.publishTimer = setInterval(this.processPublicationQueue, 1000, this);
        this.registerCleanCallbacks();
        return Promise.resolve(undefined);
    }

    public stop() {
        this.logger.log("Stopping workflow host...");
        this.stashUnpublishedEvents();

        for (let worker of this.workers) {
            worker.stop();
        }
                
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
        self.queueProvider.queueForProcessing(workflowId, QueueType.Workflow);

        return workflowId;
    }
    
    
    public registerWorkflow<TData>(workflow: WorkflowBase<TData>) {
        this.registry.registerWorkflow<TData>(workflow);
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
                    await host.queueProvider.queueForProcessing(pub.workflowId, QueueType.Workflow);
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
                    host.queueProvider.queueForProcessing(item, QueueType.Workflow);
                }
            })
            .catch(err => host.logger.error(err));
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