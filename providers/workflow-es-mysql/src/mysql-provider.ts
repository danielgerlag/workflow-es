import { IPersistenceProvider, WorkflowInstance, EventSubscription, Event, WorkflowStatus } from "workflow-es";
import { Workflow as workflowCollection } from './models/workflow';
import { Subscription as subscriptionCollection } from './models/subscription';
import { Event as eventCollection } from './models/event';
import { Sequelize } from "sequelize-typescript";
import { reject, resolve } from "bluebird";

export class MySqlPersistence implements IPersistenceProvider {

    public sequelize: any;
    public connect: Promise<void>;
    private db: any;
    private retryCount: number = 0;

    constructor(connectionString: string) {
        var self = this;
        this.sequelize = new Sequelize(connectionString)
        this.connect = new Promise<void>((resolve, reject) => {
            this.sequelize.authenticate()
            .then(async () => {
                await this.sequelize.sync();
                resolve();
            })
            .catch(err => {
                reject(err);
            });
        });
    }

    createNewWorkflow(instance: WorkflowInstance): Promise<string> {
        let deferred = new Promise<string>((resolve, reject) => {
            delete instance['executionPointers']; //Need to find a way to persist this data

            workflowCollection.create(instance)
            .then((workflow) => {
                instance.id = instance["_id"].toString();
                resolve(instance.id)
            })
            .catch(err => reject(err));
        })
        return deferred;
    }
    persistWorkflow(instance: WorkflowInstance): Promise<void> {
        let deferred = new Promise<void>(async (resolve, reject) => {
            var id = instance.id;
            delete instance['_id'];
            delete instance['executionPointers']; //Need to find a way to persist this data

            try {
                await workflowCollection.update(instance, { where: { id: id } });
                resolve();
            }
            catch (err) {
                reject(err);
            }
        });
        return deferred;
    }
    getWorkflowInstance(workflowId: string): Promise<WorkflowInstance> {
        let deferred = new Promise<WorkflowInstance>(async (resolve, reject) => {
            try {
                let workflow = await workflowCollection.findById(workflowId);
                resolve(workflow);
            }
            catch(err) {
                reject(err);
            }
            
        });
        
        return deferred
    }
    getRunnableInstances(): Promise<Array<string>> {
        //TODO: Implement
        return
    }

    createEventSubscription(subscription: EventSubscription): Promise<void> {
        //TODO: Implement
        return
    }
    getSubscriptions(eventName: string, eventKey: string, asOf: Date): Promise<Array<EventSubscription>> {
        //TODO: Implement
        return
    }
    terminateSubscription(id: string): Promise<void> {
        //TODO: Implement
        return
    }

    createEvent(event: Event): Promise<string> {
        //TODO: Implement
        return
    }    
    getEvent(id: string): Promise<Event> {
        //TODO: Implement
        return
    }
    getRunnableEvents(): Promise<Array<string>> {
        //TODO: Implement
        return
    }
    
    markEventProcessed(id: string): Promise<void> {
        //TODO: Implement
        return
    }
    markEventUnprocessed(id: string): Promise<void> {
        //TODO: Implement
        return
    }

    getEvents(eventName: string, eventKey: any, asOf: Date): Promise<Array<string>> {
        //TODO: Implement
        return
    }
}