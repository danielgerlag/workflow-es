import { inject, injectable } from "inversify";
import { WorkflowInstance, WorkflowStatus, ExecutionPointer, EventSubscription, Event } from "../models";
import { WorkflowBase, IPersistenceProvider, IWorkflowHost, IQueueProvider, IDistributedLockProvider, IWorkflowExecutor, ILogger, TYPES, QueueType, IBackgroundWorker } from "../abstractions";
import { WorkflowRegistry } from "./workflow-registry";
import { WorkflowExecutor } from "./workflow-executor";

@injectable()
export class EventQueueWorker implements IBackgroundWorker {

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
        this.logger.log("Stopping event queue worker...");        
        if (this.processTimer)
            clearInterval(this.processTimer);
    }

    private async processQueue(self: EventQueueWorker): Promise<void> {                
        try {
            let eventId = await self.queueProvider.dequeueForProcessing(QueueType.Event);
            while (eventId) {
                self.logger.log("Dequeued event " + eventId + " for processing");
                self.processEvent(self, eventId)
                    .catch((err) => {
                        self.logger.error("Error processing event", eventId, err);
                    });
                eventId = await self.queueProvider.dequeueForProcessing(QueueType.Event);
            }
        }
        catch (err) {
            self.logger.error("Error processing event queue: " + err);
        }            
    }

    private async processEvent(self: EventQueueWorker, eventId: string): Promise<void> {
        try {
            const gotLock = await self.lockProvider.aquireLock(eventId);                
            if (gotLock) {
                try {
                    let evt = await self.persistence.getEvent(eventId);
                    if (evt.eventTime === undefined || evt.eventTime <= new Date())
                    {
                        let subs = await self.persistence.getSubscriptions(evt.eventName, evt.eventKey, evt.eventTime);
                        let success = true;

                        for (let sub of subs)
                            success = success && await self.seedSubscription(self, evt, sub);

                        if (success)
                            await self.persistence.markEventProcessed(eventId);
                    }
                                        
                }
                finally {
                    await self.lockProvider.releaseLock(eventId);                    
                }                
            }
            else {
                self.logger.log("Event locked: " + eventId);
            }   
        }
        catch (err) {
            self.logger.error("Error processing event: " + err);
        }
    }

    private async seedSubscription(self: EventQueueWorker, evt: Event, sub: EventSubscription): Promise<boolean> {
        
        if (await self.lockProvider.aquireLock(sub.workflowId)) {
            try {
                let workflow = await self.persistence.getWorkflowInstance(sub.workflowId);
                let pointers = workflow.executionPointers.filter(p => p.eventName == sub.eventName && p.eventKey == sub.eventKey && !p.eventPublished);
                for (let p of pointers) {
                    p.eventData = evt.eventData;
                    p.eventPublished = true;
                    p.active = true;
                }
                workflow.nextExecution = 0;
                await self.persistence.persistWorkflow(workflow);
                await self.persistence.terminateSubscription(sub.id);
                return true;
            }
            catch (err) {
                self.logger.error(err);
                return false;
            }
            finally {
                await self.lockProvider.releaseLock(sub.workflowId);
                self.queueProvider.queueForProcessing(sub.workflowId, QueueType.Workflow);
            }
        }
        else {
            self.logger.info("Workflow locked " + sub.workflowId);
            return false;
        }
    }
}