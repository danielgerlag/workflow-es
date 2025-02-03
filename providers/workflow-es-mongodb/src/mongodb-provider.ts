import { IPersistenceProvider, WorkflowInstance, EventSubscription, Event, WorkflowStatus } from "workflow-es";
import { MongoClient, ObjectID } from "mongodb";

export class MongoDBPersistence implements IPersistenceProvider {

    public connect: Promise<void>;
    private client: any;
    private workflowCollection: any;
    private subscriptionCollection: any;
    private eventCollection: any;
    private retryCount: number = 0;

    
    constructor(connectionString: string) {
        var self = this;
        this.connect = new Promise<void>((resolve, reject) => {  
            const options =  { useNewUrlParser: true,  useUnifiedTopology: true };
            MongoClient.connect(connectionString, options, (err, client) => {
                if (err)
                    reject(err);
                self.client = client;
                const db = self.client.db();
                self.workflowCollection = db.collection("workflows");
                self.subscriptionCollection = db.collection("subscriptions");
                self.eventCollection = db.collection("events");
                resolve();
            });
        });        
    }

    public async createNewWorkflow(instance: WorkflowInstance): Promise<string> {
        var self = this;        
        let deferred = new Promise<string>((resolve, reject) => {
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
        let deferred = new Promise<void>((resolve, reject) => {            
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
        let deferred = new Promise<WorkflowInstance>((resolve, reject) => {            
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

    public async getSubscriptions(eventName: string, eventKey: string, asOf?: Date): Promise<Array<EventSubscription>> {        
        var self = this;
        var deferred = new Promise<Array<EventSubscription>>((resolve, reject) => {
            if (asOf === undefined) {
                self.subscriptionCollection.find({ eventName: eventName, eventKey: eventKey })
                .toArray((err, data) => {
                    if (err)
                        reject(err);
                    for (let item of data)
                        item.id = item["_id"].toString();
                    resolve(data);
                });
            } else {
                self.subscriptionCollection.find({ eventName: eventName, eventKey: eventKey, subscribeAsOf: { $lt: asOf } })
                .toArray((err, data) => {
                    if (err)
                        reject(err);
                    for (let item of data)
                        item.id = item["_id"].toString();
                    resolve(data);
                });
            }
        });
        return deferred;
    }

    public async terminateSubscription(id: string): Promise<void> {
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

    public async createEvent(event: Event): Promise<string> {
        var self = this;
        var deferred = new Promise<string>((resolve, reject) => {            
            self.eventCollection.insertOne(event)
                .then((err, result) => {
                    event.id = event["_id"].toString();
                    resolve(event.id);
                })
                .catch(err => reject(err));   
        });
        return deferred;
    }

    public async getEvent(id: string): Promise<Event> {
        var self = this;
        var deferred = new Promise<Event>((resolve, reject) => {            
            self.eventCollection.findOne({ _id: ObjectID(id) }, ((err, doc) => {
                if (err)
                    reject(err);
                doc.id = doc._id.toString();
                resolve(doc);
            }));
        });
        return deferred;
    }

    public async getRunnableEvents(): Promise<Array<string>> {
        var self = this;
        var deferred = new Promise<Array<string>>((resolve, reject) => {
            self.eventCollection.find({ isProcessed: false, eventTime : { $lt: new Date() } }, { _id: 1 })
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
    
    public async markEventProcessed(id: string): Promise<void> {
        var self = this;
        let deferred = new Promise<void>((resolve, reject) => {
            self.eventCollection.findOneAndUpdate({ _id: ObjectID(id) },{ $set: { isProcessed: true } }, { returnOriginal:true }, 
            (err, r) => {
                if (err)
                    reject(err);
                resolve();
            });
        });        
        return deferred;
    }

    public async markEventUnprocessed(id: string): Promise<void> {
        var self = this;
        let deferred = new Promise<void>((resolve, reject) => {            
            self.eventCollection.findOneAndUpdate({ _id: ObjectID(id) }, { $set: { isProcessed: false } }, { returnOriginal:true }, 
            (err, r) => {
                if (err)
                    reject(err);
                resolve();
            });
        });        
        return deferred;
    }

    public async getEvents(eventName: string, eventKey: any, asOf: Date): Promise<Array<string>> {
        var self = this;
        var deferred = new Promise<Array<string>>((resolve, reject) => {            
            self.eventCollection.find({ eventName: eventName, eventKey: eventKey, eventTime : { $gt: asOf } }, { _id: 1 })
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
}
