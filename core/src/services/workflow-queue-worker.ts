import { inject } from "inversify";
import { WorkflowInstance, WorkflowStatus, ExecutionPointer, EventSubscription, Event } from "../models";
import { WorkflowBase, IPersistenceProvider, IWorkflowHost, IQueueProvider, IDistributedLockProvider, IWorkflowExecutor, ILogger, TYPES, QueueType, IBackgroundWorker } from "../abstractions";
import { WorkflowRegistry } from "./workflow-registry";
import { WorkflowExecutor } from "./workflow-executor";

export class WorkflowQueueWorker implements IBackgroundWorker {

    @inject(TYPES.IWorkflowExecutor) 
    private  executor: IWorkflowExecutor;

    @inject(TYPES.IPersistenceProvider)
    private persistence: IPersistenceProvider;

    @inject(TYPES.IDistributedLockProvider)
    private lockProvider: IDistributedLockProvider;

    @inject(TYPES.IQueueProvider)
    private queueProvider:  IQueueProvider;

    @inject(TYPES.ILogger)
    private logger: ILogger;

    private processTimer: any;

    public start() {        
        this.processTimer = setInterval(this.processQueue, 500, this);
    }

    public stop() {
        this.logger.log("Stopping workflow host...");        
        if (this.processTimer)
            clearInterval(this.processTimer);
    }

    private async processQueue(): Promise<void> {                
        try {
            var workflowId = await this.queueProvider.dequeueForProcessing(QueueType.Workflow);
            while (workflowId) {
                this.logger.log("Dequeued workflow " + workflowId + " for processing");
                this.processWorkflow(workflowId)
                    .catch((err) => {
                        this.logger.error("Error processing workflow", workflowId, err);
                    });
                workflowId = await this.queueProvider.dequeueForProcessing(QueueType.Workflow);
            }
        }
        catch (err) {
            this.logger.error("Error processing workflow queue: " + err);
        }            
    }

    private async processWorkflow(workflowId: string): Promise<void> {
        try {
            var gotLock = await this.lockProvider.aquireLock(workflowId);                
            if (gotLock) {
                var complete = false;
                try {
                    var instance: WorkflowInstance = await this.persistence.getWorkflowInstance(workflowId);                        
                    if (instance.status == WorkflowStatus.Runnable) {
                        try {
                            await this.executor.execute(instance);
                            complete = true;
                        }
                        finally {
                            await this.persistence.persistWorkflow(instance);                        
                        }
                    }                    
                }
                finally {
                    await this.lockProvider.releaseLock(workflowId);
                    if (complete) {
                        if ((instance.status == WorkflowStatus.Runnable) && (instance.nextExecution !== null)) {
                            if (instance.nextExecution < Date.now()) {                                
                                this.queueProvider.queueForProcessing(workflowId, QueueType.Workflow);
                            }
                        }
                    }
                }                
            }
            else {
                this.logger.log("Workflow locked: " + workflowId);
            }   
        }
        catch (err) {
            this.logger.error("Error processing workflow: " + err);
        }
    }

    private async subscribeEvent(subscription: EventSubscription) {
        //TODO: move to own class       
        
        await this.persistence.createEventSubscription(subscription);
        var events = await this.persistence.getEvents(subscription.eventName, subscription.eventKey, subscription.subscribeAsOf);
        for (let evt of events) {
            await this.persistence.markEventUnprocessed(evt);
            this.queueProvider.queueForProcessing(evt, QueueType.Event);
        }
    }
}