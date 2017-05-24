import { injectable, inject, multiInject } from "inversify";
import { WorkflowInstance, WorkflowStatus, ExecutionPointer, EventSubscription } from "../models";
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
    
    private registerCleanCallbacks() {
        var self = this;

        if (typeof process !== 'undefined' && process) {
            process.on('SIGINT', () => {
                self.stop();
            });
        }
    }

}