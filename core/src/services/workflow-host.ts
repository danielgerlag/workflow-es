import { injectable, inject, multiInject } from "inversify";
import { WorkflowInstance, WorkflowStatus, ExecutionPointer, EventSubscription, Event } from "../models";
import { WorkflowBase, IWorkflowRegistry, IPersistenceProvider, IWorkflowHost, IQueueProvider, QueueType, IDistributedLockProvider, IBackgroundWorker, TYPES, ILogger, IExecutionPointerFactory } from "../abstractions";
import { WorkflowQueueWorker } from "./workflow-queue-worker";

import { MemoryPersistenceProvider } from "./memory-persistence-provider";
import { SingleNodeLockProvider } from "./single-node-lock-provider";
import { SingleNodeQueueProvider } from "./single-node-queue-provider";
import { NullLogger } from "./null-logger";

@injectable()
export class WorkflowHost implements IWorkflowHost {

    @inject(TYPES.IWorkflowRegistry)
    private registry : IWorkflowRegistry;

    @multiInject(TYPES.IBackgroundWorker)
    private workers: IBackgroundWorker[];

    @inject(TYPES.IPersistenceProvider)
    private persistence: IPersistenceProvider;

    @inject(TYPES.IDistributedLockProvider)
    private lockProvider: IDistributedLockProvider;
    
    @inject(TYPES.IQueueProvider)
    private queueProvider:  IQueueProvider = new SingleNodeQueueProvider();

    @inject(TYPES.IExecutionPointerFactory)
    private pointerFactory : IExecutionPointerFactory;

    @inject(TYPES.ILogger)
    private logger: ILogger;

    public start(): Promise<void> {        
        this.logger.log("Starting workflow host...");
        for (let worker of this.workers) {
            worker.start();
        }
        this.registerCleanCallbacks();
        return Promise.resolve(undefined);
    }

    public stop() {
        this.logger.log("Stopping workflow host...");

        for (let worker of this.workers) {
            worker.stop();
        }
    }
    
    public async startWorkflow(id: string, version: number, data: any = {}): Promise<string> {
        let self = this;
        let def = self.registry.getDefinition(id, version);
        let wf = new WorkflowInstance();
        wf.data = data;
        wf.description = def.description;
        wf.workflowDefinitionId = def.id;
        wf.version = def.version;
        wf.nextExecution = 0;
        wf.createTime = new Date();
        wf.status = WorkflowStatus.Runnable;
        
        let ep = this.pointerFactory.buildGenesisPointer(def);
        wf.executionPointers.push(ep);
        
        let workflowId = await self.persistence.createNewWorkflow(wf);
        self.queueProvider.queueForProcessing(workflowId, QueueType.Workflow);

        return workflowId;
    }
    
    
    public registerWorkflow<TData>(workflow: new () => WorkflowBase<TData>) {
        this.registry.registerWorkflow<TData>(new workflow());
    }

    public async publishEvent(eventName: string, eventKey: string, eventData: any, eventTime: Date): Promise<void> {
        //todo: check host status        

        this.logger.info("Publishing event %s %s", eventName, eventKey);

        let evt = new Event();
        evt.eventData = eventData;
        evt.eventKey = eventKey;
        evt.eventName = eventName;
        evt.eventTime = eventTime;
        evt.isProcessed = false;
        let id = await this.persistence.createEvent(evt);
        this.queueProvider.queueForProcessing(id, QueueType.Event);        
    }

    
    public async suspendWorkflow(id: string): Promise<boolean> {
        let self = this;
        try {        
            let result = false;
            let gotLock = await self.lockProvider.aquireLock(id);
            
            if (gotLock) {              
                try {
                    let wf = await self.persistence.getWorkflowInstance(id);
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
        let self = this;
        try {        
            let result = false;
            let gotLock = await self.lockProvider.aquireLock(id);
            
            if (gotLock) {              
                try {
                    let wf = await self.persistence.getWorkflowInstance(id);
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
        let self = this;
        try {        
            let result = false;
            let gotLock = await self.lockProvider.aquireLock(id);
            
            if (gotLock) {              
                try {
                    let wf = await self.persistence.getWorkflowInstance(id);                    
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
    
    private registerCleanCallbacks() {
        let self = this;

        if (typeof process !== 'undefined' && process) {
            process.on('SIGINT', () => {
                self.stop();
            });
        }
    }

}