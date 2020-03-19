import { injectable, inject } from "inversify";
import { IPersistenceProvider } from "../abstractions";
import { WorkflowInstance, WorkflowStatus, EventSubscription, Event } from "../models";

var wfes_instances: Array<WorkflowInstance> = [];
var wfes_subscriptions: Array<EventSubscription> = [];
var wfes_events: Array<Event> = [];

// In-memory implementation of IPersistenceProvider for demo and testing purposes
@injectable()
export class MemoryPersistenceProvider implements IPersistenceProvider {
    
    public async createNewWorkflow(instance: WorkflowInstance): Promise<string> {
        instance.id = this.generateUID();
        wfes_instances.push(instance);        
        return instance.id;
    }
    
    public async persistWorkflow(instance: WorkflowInstance): Promise<void> {        
        let idx = wfes_instances.findIndex(x => x.id == instance.id);
        wfes_instances[idx] = instance;
    }

    public async getWorkflowInstance(workflowId: string): Promise<WorkflowInstance> {
        let existing = wfes_instances.find(x => x.id == workflowId);
        return existing;
    }

    public async getRunnableInstances(): Promise<Array<string>> {        
        let runnables: Array<WorkflowInstance> = wfes_instances.filter(x => x.status == WorkflowStatus.Runnable && x.nextExecution < Date.now());
        let result: Array<string> = [];
        for (let item of runnables) {
            result.push(item.id);
        }
        return result;
    }

    public async createEventSubscription(subscription: EventSubscription): Promise<void> {
        subscription.id = this.generateUID();
        wfes_subscriptions.push(subscription);
    }

    public async getSubscriptions(eventName: string, eventKey: string, asOf?: Date): Promise<Array<EventSubscription>> {        
        return wfes_subscriptions.filter(x => x.eventName == eventName && x.eventKey == eventKey && (asOf ? x.subscribeAsOf <= asOf : true));
    }

    public async terminateSubscription(id: string): Promise<void> {
        for (let item of wfes_subscriptions.filter(x => x.id == id)) {
            wfes_subscriptions.splice(wfes_subscriptions.indexOf(item), 1);
        }        
    }

    public async createEvent(event: Event): Promise<string> {
        event.id = this.generateUID();
        wfes_events.push(event);
        return event.id;        
    }

    public async getEvent(id: string): Promise<Event> {
        return wfes_events.find(x => x.id == id);
    }

    public async getRunnableEvents(): Promise<Array<string>> {
        return wfes_events
            .filter(x => !x.isProcessed && x.eventTime <= new Date())
            .map<string>(x => x.id);
    }
    
    public async markEventProcessed(id: string): Promise<void> {
        let evt = wfes_events.find(x => x.id == id);
        if (evt)
            evt.isProcessed = true;
    }

    public async markEventUnprocessed(id: string): Promise<void> {
        let evt = wfes_events.find(x => x.id == id);
        if (evt)
            evt.isProcessed = false;
    }

    public async getEvents(eventName: string, eventKey: any, asOf: Date): Promise<Array<string>> {
        return wfes_events
            .filter(x => x.eventName == eventName && x.eventKey == eventKey && x.eventTime >= asOf)
            .map<string>(x => x.id);
    }

    private generateUID(): string {
        return (Math.random() * 0x10000000000000).toString(16);
    }

}