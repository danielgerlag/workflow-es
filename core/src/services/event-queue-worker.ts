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
        this.processTimer = setInterval(this.processQueue, 1000, this);
    }

    public stop() {
        this.logger.log("Stopping event queue worker...");        
        if (this.processTimer)
            clearInterval(this.processTimer);
    }

    private async processQueue(): Promise<void> {                
        try {
            var eventId = await this.queueProvider.dequeueForProcessing(QueueType.Event);
            while (eventId) {
                this.logger.log("Dequeued event " + eventId + " for processing");
                this.processEvent(eventId)
                    .catch((err) => {
                        this.logger.error("Error processing event", eventId, err);
                    });
                eventId = await this.queueProvider.dequeueForProcessing(QueueType.Event);
            }
        }
        catch (err) {
            this.logger.error("Error processing event queue: " + err);
        }            
    }

    private async processEvent(eventId: string): Promise<void> {
        try {
            var gotLock = await this.lockProvider.aquireLock(eventId);                
            if (gotLock) {
                try {
                    var evt = await this.persistence.getEvent(eventId);
                    if (evt.eventTime <= new Date())
                    {
                        var subs = await this.persistence.getSubscriptions(evt.eventName, evt.eventKey, evt.eventTime);
                        var success = true;

                        for (let sub of subs)
                            success = success && await this.seedSubscription(evt, sub);

                        if (success)
                            await this.persistence.markEventProcessed(eventId);
                    }
                                        
                }
                finally {
                    await this.lockProvider.releaseLock(eventId);                    
                }                
            }
            else {
                this.logger.log("Event locked: " + eventId);
            }   
        }
        catch (err) {
            this.logger.error("Error processing event: " + err);
        }
    }

    private async seedSubscription(evt: Event, sub: EventSubscription): Promise<boolean> {
        if (await this.lockProvider.aquireLock(sub.workflowId)) {
            try {
                var workflow = await this.persistence.getWorkflowInstance(sub.workflowId);
                var pointers = workflow.executionPointers.filter(p => p.eventName == sub.eventName && p.eventKey == sub.eventKey && !p.eventPublished);
                for (let p of pointers) {
                    p.eventData = evt.eventData;
                    p.eventPublished = true;
                    p.active = true;
                }
                workflow.nextExecution = 0;
                await this.persistence.persistWorkflow(workflow);
                await this.persistence.terminateSubscription(sub.id);
                return true;
            }
            catch (err) {
                this.logger.error(err);
                return false;
            }
            finally {
                await this.lockProvider.releaseLock(sub.workflowId);
                this.queueProvider.queueForProcessing(sub.workflowId, QueueType.Workflow);
            }
        }
        else {
            this.logger.info("Workflow locked " + sub.workflowId);
            return false;
        }
    }
}