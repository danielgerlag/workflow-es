import { IPersistenceProvider, WorkflowInstance, EventSubscription, EventPublication, WorkflowStatus } from "workflow-es";
import { MongoClient, ObjectID } from "mongodb";

export class MongoDBPersistence implements IPersistenceProvider {

    private connect: Promise<void>;
    private db: any;
    private workflowCollection: any;
    private subscriptionCollection: any;
    private publishCollection: any;
    private retryCount: number = 0;

    
    constructor(connectionString: string, connected: () => void = null) {
        var self = this;
        this.connect = new Promise<void>((resolve, reject) => {            
            MongoClient.connect(connectionString, (err, db) => {                
                self.db = db;
                self.workflowCollection = self.db.collection("workflows");
                self.subscriptionCollection = self.db.collection("subscriptions");
                self.publishCollection = self.db.collection("unpublished");
                if (connected)
                    connected();
            });
        });
        
    }

    public async createNewWorkflow(instance: WorkflowInstance): Promise<string> {
        var self = this;        
        var deferred = new Promise<string>((resolve, reject) => {
            self.workflowCollection.insertOne(instance)
                .then((err, result) => {
                    instance.id = instance["_id"].toString();
                    resolve(instance.id);
                })
                .catch(err => reject(err));        
        });
        return deferred;        
    }

    public persistWorkflow(instance: WorkflowInstance): Promise<void> {
        var self = this;
        var deferred = new Promise<void>((resolve, reject) => {
            
            var id = ObjectID(instance.id);
            delete instance['_id'];
            self.workflowCollection.findOneAndUpdate({ _id: id }, { $set: instance }, { returnOriginal: false }, 
            (err, r) => {
                if (err)
                    reject(err);
                resolve();
            });
            
            
        });        
        return deferred;
    }

    public getWorkflowInstance(workflowId: string): Promise<WorkflowInstance> {
        var self = this;
        var deferred = new Promise<WorkflowInstance>((resolve, reject) => {
            
            self.workflowCollection.findOne({ _id: ObjectID(workflowId) }, ((err, doc) => {
                if (err)
                    reject(err);
                doc.id = doc._id.toString();
                resolve(doc);
            }));

        });
        return deferred;
    }

    public getRunnableInstances(): Promise<Array<string>> {
        var self = this;
        var deferred = new Promise<Array<string>>((resolve, reject) => {            
            self.workflowCollection.find({ status: WorkflowStatus.Runnable, nextExecution : { $lt: Date.now() } }, { _id: 1 })
                .toArray((err, data) => {
                    if (err)
                        reject(err);
                    var result = [];
                    for (let item of data)
                        result.push(item["_id"].toString());
                    resolve(result);
                });            
        });
        return deferred;
    }

    public createEventSubscription(subscription: EventSubscription): Promise<void> {
        var self = this;
        var deferred = new Promise<void>((resolve, reject) => {            
            self.subscriptionCollection.insertOne(subscription)
                .then((err, result) => {
                    subscription.id = subscription["_id"].toString();
                    resolve();
                })
                .catch(err => reject(err));   
        });
        return deferred;
    }

    public getSubscriptions(eventName: string, eventKey: string): Promise<Array<EventSubscription>> {
        var self = this;
        var deferred = new Promise<Array<EventSubscription>>((resolve, reject) => {
            self.subscriptionCollection.find({ eventName: eventName, eventKey: eventKey })
                .toArray((err, data) => {
                    if (err)
                        reject(err);
                    for (let item of data)
                        item.id = item["_id"].toString();
                    resolve(data);
                });   

        });
        return deferred;
    }

    public terminateSubscription(id: string): Promise<void> {
        var self = this;
        var deferred = new Promise<void>((resolve, reject) => {
            self.subscriptionCollection.remove( { _id: ObjectID(id) }, { single: true }, function(err, numberOfRemovedDocs) {
                if (err)
                    reject(err);
                resolve();
            });
        });
        return deferred;
    }

    public createUnpublishedEvent(publication: EventPublication): Promise<void> {
        var self = this;
        var deferred = new Promise<void>((resolve, reject) => {
            self.publishCollection.insertOne(publication)
                .then((err, result) => {                    
                    resolve();
                })
                .catch(err => reject(err));
        });
        return deferred;
    }

    public getUnpublishedEvents(): Promise<Array<EventPublication>> {
        var self = this;
        var deferred = new Promise<Array<EventPublication>>((resolve, reject) => {
            self.publishCollection.find({})
                .toArray((err, data) => {
                    if (err)
                        reject(err);
                    resolve(data);
                });
        });
        return deferred;
    }

    public removeUnpublishedEvent(id: string): Promise<void> {
        var self = this;
        var deferred = new Promise<void>((resolve, reject) => {
            self.publishCollection.remove( { id: id }, { w: 1 }, function(err, numberOfRemovedDocs) {
                if (err)
                    reject(err);
                resolve();
            });
        });
        return deferred;
    }

}