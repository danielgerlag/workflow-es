import { inject, injectable, Container } from "inversify";
import { WorkflowInstance, WorkflowStatus, ExecutionPointer, EventSubscription, Event } from "../models";
import { WorkflowBase, IPersistenceProvider, IWorkflowHost, IQueueProvider, IDistributedLockProvider, IWorkflowExecutor, ILogger, TYPES, QueueType, IWorkflowQueueWorker } from "../abstractions";
import { WorkflowRegistry } from "./workflow-registry";
import { WorkflowExecutor } from "./workflow-executor";

@injectable()
export class WorkflowQueueWorker implements IWorkflowQueueWorker {

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
    private interval = 100;

    public setInterval(ms: number) {
        this.interval = ms;
    }

    public getInterval() {
        return this.interval;
    }

    public updateFromContainer(container: Container) {
        this.executor = container.get(TYPES.IWorkflowExecutor);
        this.persistence = container.get(TYPES.IPersistenceProvider);
        this.lockProvider = container.get(TYPES.IDistributedLockProvider);
        this.queueProvider = container.get(TYPES.IQueueProvider);
        this.logger = container.get(TYPES.ILogger);
    }

    public start() {        
        this.processTimer = setInterval(this.processQueue, this.interval, this);
    }

    public stop() {
        this.logger.log("Stopping workflow queue worker...");        
        if (this.processTimer)
            clearInterval(this.processTimer);
    }

    private async processQueue(self: WorkflowQueueWorker): Promise<void> {                
        try {
            let workflowId = await self.queueProvider.dequeueForProcessing(QueueType.Workflow);
            while (workflowId) {
                self.logger.log("Dequeued workflow " + workflowId + " for processing");
                self.processWorkflow(self, workflowId)
                    .catch((err) => {
                        self.logger.error("Error processing workflow", workflowId, err);
                    });
                workflowId = await self.queueProvider.dequeueForProcessing(QueueType.Workflow);
            }
        }
        catch (err) {
            self.logger.error("Error processing workflow queue: " + err);
        }            
    }

    private async processWorkflow(self: WorkflowQueueWorker, workflowId: string): Promise<void> {
        try {
            const gotLock = await self.lockProvider.aquireLock(workflowId);                
            if (gotLock) {
                let complete = false;
                try {
                    var instance: WorkflowInstance = await self.persistence.getWorkflowInstance(workflowId);
                    if (!instance)
                        throw `Workflow ${workflowId} not found`;

                    if (instance.status == WorkflowStatus.Runnable) {
                        try {
                            var result = await self.executor.execute(instance);
                            complete = true;
                        }
                        finally {
                            await self.persistence.persistWorkflow(instance);                        
                        }
                    }                    
                }
                finally {
                    await self.lockProvider.releaseLock(workflowId);
                    if (complete) {
                        //TODO: cleanup
                        for (let sub of result.subscriptions) {
                            await self.subscribeEvent(self, sub);
                        }

                        if ((instance.status == WorkflowStatus.Runnable) && (instance.nextExecution !== null)) {
                            if (instance.nextExecution < Date.now()) {                                
                                self.queueProvider.queueForProcessing(workflowId, QueueType.Workflow);
                            }
                        }
                    }
                }                
            }
            else {
                self.logger.log("Workflow locked: " + workflowId);
            }   
        }
        catch (err) {
            self.logger.error("Error processing workflow: " + err);
        }
    }

    private async subscribeEvent(self: WorkflowQueueWorker, subscription: EventSubscription) {
        //TODO: move to own class       
        
        await self.persistence.createEventSubscription(subscription);
        let events = await self.persistence.getEvents(subscription.eventName, subscription.eventKey, subscription.subscribeAsOf);
        for (let evt of events) {
            await self.persistence.markEventUnprocessed(evt);
            self.queueProvider.queueForProcessing(evt, QueueType.Event);
        }
    }
}