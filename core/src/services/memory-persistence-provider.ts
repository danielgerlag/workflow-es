import { IPersistenceProvider } from "../abstractions";
import { WorkflowInstance, WorkflowStatus, EventSubscription, EventPublication } from "../models";

// In-memory implementation of IPersistenceProvider for demo and testing purposes
export class MemoryPersistenceProvider implements IPersistenceProvider {

    private instances: Array<WorkflowInstance> = [];
    private subscriptions: Array<EventSubscription> = [];
    private publications: Array<EventPublication> = [];
    
    
    public createNewWorkflow(instance: WorkflowInstance): Promise<string> {
        var self = this;
        var deferred = new Promise<string>((resolve, reject) => {            
            instance.id = this.generateUID();
            self.instances.push(instance);
            resolve(instance.id);
        });
        return deferred;
    }
    
    public persistWorkflow(instance: WorkflowInstance): Promise<void> {
        var self = this;
        var deferred = new Promise<void>((resolve, reject) => {            
            var _ = require("underscore");
            var existing = _.findWhere(self.instances, { id: instance.id });
            var idx = self.instances.indexOf(existing)
            self.instances[idx] = instance;
            resolve();
        });        
        return deferred;
    }

    public getWorkflowInstance(workflowId: string): Promise<WorkflowInstance> {
        var self = this;
        var deferred = new Promise<WorkflowInstance>((resolve, reject) => {
            var _ = require("underscore");
            var existing = _.findWhere(self.instances, { id: workflowId });
            resolve(existing);
        });
        return deferred;
    }

    public getRunnableInstances(): Promise<Array<string>> {
        var self = this;
        var deferred = new Promise<Array<string>>((resolve, reject) => {
            var _ = require("underscore");
            var runnables: Array<WorkflowInstance> = self.instances.filter(x => x.status == WorkflowStatus.Runnable && x.nextExecution < Date.now());
            var result: Array<string> = [];
            for (let item of runnables) {
                result.push(item.id);
            }
            resolve(result);
        });
        return deferred;
    }

    public createEventSubscription(subscription: EventSubscription): Promise<void> {
        var self = this;
        var deferred = new Promise<void>((resolve, reject) => {            
            subscription.id = this.generateUID();
            self.subscriptions.push(subscription);
            resolve();
        });
        return deferred;
    }

    public getSubscriptions(eventName: string, eventKey: string): Promise<Array<EventSubscription>> {
        var self = this;
        var deferred = new Promise<Array<EventSubscription>>((resolve, reject) => {
            resolve(self.subscriptions.filter(x => x.eventName == eventName && x.eventKey == eventKey));
        });
        return deferred;
    }

    public terminateSubscription(id: string): Promise<void> {
        var self = this;
        var deferred = new Promise<void>((resolve, reject) => {
            for (let item of self.subscriptions.filter(x => x.id == id)) {
                self.subscriptions.splice(self.subscriptions.indexOf(item), 1);
            }
            resolve();
        });
        return deferred;
    }

    public createUnpublishedEvent(publication: EventPublication): Promise<void> {
        var self = this;
        var deferred = new Promise<void>((resolve, reject) => {
            self.publications.push(publication);
            resolve();
        });
        return deferred;
    }

    public getUnpublishedEvents(): Promise<Array<EventPublication>> {
        var self = this;
        var deferred = new Promise<Array<EventPublication>>((resolve, reject) => {
            resolve(self.publications);
        });
        return deferred;
    }

    public removeUnpublishedEvent(id: string): Promise<void> {
        var self = this;
        var deferred = new Promise<void>((resolve, reject) => {
            for (let item of self.publications.filter(x => x.id == id)) {
                self.publications.splice(self.publications.indexOf(item), 1);
            }
            resolve();
        });
        return deferred;
    }

    private generateUID(): string {
        return (Math.random() * 0x10000000000000).toString(16);
    }

}