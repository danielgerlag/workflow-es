import { injectable, inject } from "inversify";
import { IPersistenceProvider } from "../abstractions";
import { WorkflowInstance, WorkflowStatus, EventSubscription, EventPublication } from "../models";

// In-memory implementation of IPersistenceProvider for demo and testing purposes
@injectable()
export class MemoryPersistenceProvider implements IPersistenceProvider {

    private instances: Array<WorkflowInstance> = [];
    private subscriptions: Array<EventSubscription> = [];
    private publications: Array<EventPublication> = [];
    
    
    public async createNewWorkflow(instance: WorkflowInstance): Promise<string> {
        instance.id = this.generateUID();
        this.instances.push(instance);        
        return instance.id;
    }
    
    public async persistWorkflow(instance: WorkflowInstance): Promise<void> {
        var _ = require("underscore");
        var existing = _.findWhere(this.instances, { id: instance.id });
        var idx = this.instances.indexOf(existing)
        this.instances[idx] = instance;
    }

    public async getWorkflowInstance(workflowId: string): Promise<WorkflowInstance> {
        var _ = require("underscore");
        var existing = _.findWhere(this.instances, { id: workflowId });
        return existing;
    }

    public async getRunnableInstances(): Promise<Array<string>> {
        var _ = require("underscore");
        var runnables: Array<WorkflowInstance> = this.instances.filter(x => x.status == WorkflowStatus.Runnable && x.nextExecution < Date.now());
        var result: Array<string> = [];
        for (let item of runnables) {
            result.push(item.id);
        }
        return result;
    }

    public async createEventSubscription(subscription: EventSubscription): Promise<void> {
        subscription.id = this.generateUID();
        this.subscriptions.push(subscription);        
    }

    public async getSubscriptions(eventName: string, eventKey: string): Promise<Array<EventSubscription>> {        
        return this.subscriptions.filter(x => x.eventName == eventName && x.eventKey == eventKey);
    }

    public async terminateSubscription(id: string): Promise<void> {
        for (let item of this.subscriptions.filter(x => x.id == id)) {
            this.subscriptions.splice(this.subscriptions.indexOf(item), 1);
        }        
    }

    public async createUnpublishedEvent(publication: EventPublication): Promise<void> {
        this.publications.push(publication);
    }

    public async getUnpublishedEvents(): Promise<Array<EventPublication>> {
        return this.publications;
    }

    public async removeUnpublishedEvent(id: string): Promise<void> {
        var self = this;        
        for (let item of self.publications.filter(x => x.id == id)) {
            self.publications.splice(self.publications.indexOf(item), 1);
        }
    }

    private generateUID(): string {
        return (Math.random() * 0x10000000000000).toString(16);
    }

}