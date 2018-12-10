import { IPersistenceProvider, WorkflowInstance, EventSubscription, Event, WorkflowStatus } from "workflow-es";
import { Workflow as workflowCollection } from "./models/workflow";
import { Subscription as subscriptionCollection } from "./models/subscription";
import { Event as eventCollection } from "./models/event";
import { Sequelize } from "sequelize-typescript";
import { ExecutionPointer } from "./models/executionPointer";

export class MySqlPersistence implements IPersistenceProvider {
  public sequelize: any;
  public connect: Promise<void>;

  constructor(connectionString: string) {
    this.sequelize = new Sequelize(connectionString);
    this.connect = new Promise<void>((resolve, reject) => {
      this.sequelize
        .authenticate()
        .then(async () => {
          await this.sequelize.sync();
          resolve();
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  public async createNewWorkflow(instance: WorkflowInstance): Promise<string> {
    let deferred = new Promise<string>((resolve, reject) => {

      workflowCollection
        .create(instance, { include: [ExecutionPointer] })
        .then(workflow => {
          instance.id = workflow["id"].toString();
          resolve(instance.id);
        })
        .catch(err => reject(err));
    });
    return deferred;
  }
  public async persistWorkflow(instance: WorkflowInstance): Promise<void> {
    let deferred = new Promise<void>(async (resolve, reject) => {
      var id = instance.id;
      delete instance["id"];

      try {
        var workflow = await workflowCollection.findOne({ where: { id: id }, include: [ExecutionPointer] });
        await workflow.updateAttributes(instance);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
    return deferred;
  }
  public async getWorkflowInstance(workflowId: string): Promise<WorkflowInstance> {
    let deferred = new Promise<WorkflowInstance>(async (resolve, reject) => {
      try {
        let workflow = await workflowCollection.findById(workflowId);
        resolve(workflow);
      } catch (err) {
        reject(err);
      }
    });

    return deferred;
  }
  public async getRunnableInstances(): Promise<Array<string>> {
    var deferred = new Promise<Array<string>>(async (resolve, reject) => {
      try {
        let instances = await workflowCollection.findAll({
          where: {
            status: WorkflowStatus.Runnable,
            nextExecution: { $lt: Date.now() },
            id: 1
          }
        });
        var result = [];
        for (let item of instances) {
          result.push(item["id"].toString());
        }
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
    return deferred;
  }

  public async createEventSubscription(subscription: EventSubscription): Promise<void> {
    var deferred = new Promise<void>((resolve, reject) => {
      subscriptionCollection
        .create(subscription)
        .then(sub => {
          subscription.id = sub["id"].toString();
          resolve();
        })
        .catch(err => {
          reject(err);
        });
    });
    return deferred;
  }
  public async getSubscriptions(eventName: string, eventKey: string, asOf: Date): Promise<Array<EventSubscription>> {
    var deferred = new Promise<Array<EventSubscription>>(
      async (resolve, reject) => {
          try {
              var instances = await subscriptionCollection.findAll({
                  where: {
                      eventName: eventName,
                      eventKey: eventKey,
                      subscribeAsOf: { $lt: asOf }
                  }
              });

              let result = new Array<EventSubscription>();
              for (let instance of instances) {
                  let event = new EventSubscription();

                  event.id = instance.id;
                  //event.workflowId = instance.workflowId;
                  event.stepId = instance.stepId;
                  event.eventName = instance.eventName;
                  event.eventKey = instance.eventKey;
                  event.subscribeAsOf = instance.subscribeAsOf;

                  result.push
              }
              resolve(result);
          }
          catch(err) {
              reject(err);
          }
      }
    );
    return deferred;
  }
  public async terminateSubscription(id: string): Promise<void> {
      var deferred = new Promise<void>((resolve, reject) =>{
          try {
              subscriptionCollection.destroy({ where: { id: id } });
              resolve();
          }
          catch(err) {
              reject(err);
          }
      });
    return deferred;
  }

  public async createEvent(event: Event): Promise<string> {
    var deferred = new Promise<string>((resolve, reject) => {
        eventCollection
        .create(event)
        .then(evnt => {
          event.id = evnt["id"].toString();
          resolve();
        })
        .catch(err => {
          reject(err);
        });
    });
    return deferred;
  }
  public async getEvent(id: string): Promise<Event> {
    var deferred = new Promise<Event>(async (resolve, reject) => {
        try {
            let event = await eventCollection.findById(id);
            resolve(event);
        }
        catch(err) {
            reject(err);
        }
    });
    return deferred;
  }
  public async getRunnableEvents(): Promise<Array<string>> {
    var deferred = new Promise<Array<string>>(async (resolve, reject) => {
        try {
            var events = await eventCollection.findAll({ 
                where: {
                    isProcessed: false,
                    eventTime: { $lt: new Date() },
                    id: 1
                }
            });
            var result = [];
            for (let event of events) {
                result.push(event["id"].toString());
            }
            resolve(result);
        }
        catch(err) {
            reject(err);
        }
    });
    return deferred;
  }

  public async markEventProcessed(id: string): Promise<void> {
      var deferred = new Promise<void>(async (resolve, reject) => {
          try {
            var event = await eventCollection.findOne({ where: { id: id } });
            await event.update({ isProcessed: true })
            resolve();
          }
          catch(err) {
              reject(err);
          }
      });
    return deferred;
  }
  public async markEventUnprocessed(id: string): Promise<void> {
    var deferred = new Promise<void>(async (resolve, reject) => {
        try {
          var event = await eventCollection.findOne({ where: { id: id } });
          await event.update({ isProcessed: false })
          resolve();
        }
        catch(err) {
            reject(err);
        }
    });
  return deferred;
  }

  public async getEvents(eventName: string, eventKey: any, asOf: Date): Promise<Array<string>> {
      var deferred = new Promise<Array<string>>(async (resolve, reject) => {
          try {
              var events = await eventCollection.findAll({
                  where: {
                      eventName: eventName,
                      eventKey: eventKey,
                      eventTime: { $gt: asOf },
                      id: 1
                  }
              });
              var result = [];
              for (let event of events) {
                  result.push(event["id"].toString);
              }
              resolve(result);
          }
          catch(err) {
              reject(err);
          }
      });
    return deferred;
  }
}
