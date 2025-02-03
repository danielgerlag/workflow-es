import { IPersistenceProvider, WorkflowInstance, EventSubscription, Event, WorkflowStatus } from "workflow-es";
import { Workflow as workflowCollection, Workflow } from "./models/workflow";
import { Subscription as subscriptionCollection } from "./models/subscription";
import { Event as eventCollection } from "./models/event";
import { initializeSequelize } from "./sequelize";

export class MySqlPersistence implements IPersistenceProvider {
  public connect: Promise<void>;

  constructor(connectionString: string) {
    this.connect = new Promise<void>(async (resolve, reject) => {

      try {
        await initializeSequelize(connectionString)
        resolve();
      }
      catch(err) {
        reject(err);
      }

    });
  }

  public async createNewWorkflow(instance: WorkflowInstance): Promise<string> {
    let deferred = new Promise<string>( async (resolve, reject) => {

      try {
        let workflow = await workflowCollection.create(instance);
        instance.id = workflow.id;
        resolve(instance.id);
      }
      catch(err) {
        reject(err);
      }
    });
    return deferred;
  }
  public async persistWorkflow(instance: WorkflowInstance): Promise<void> {
    let deferred = new Promise<void>(async (resolve, reject) => {
      var id = instance.id;
      // delete instance.id; This line is deleting the id from the original instance

      var newInstance = {
        workflowDefinitionId: instance.workflowDefinitionId,
        version: instance.version,
        description: instance.description,
        nextExecution: instance.nextExecution,
        status: instance.status,
        data: instance.data,
        createTime: instance.createTime,
        completeTime: instance.completeTime,
        executionPointers: instance.executionPointers
      }

      try {
        var workflow = await workflowCollection.findOne({ where: { id: id }});
        await workflow.update(newInstance);
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
        let workflow = await workflowCollection.findOne({where: { id: workflowId }});
        resolve(workflow.get({ plain: true }));
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
            nextExecution: { $lt: Date.now() }
          },
          attributes: ['id']
        });
        var result = [];
        for (let item of instances) {
          result.push(item.id);
        }
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
    return deferred;
  }

  public async createEventSubscription(subscription: EventSubscription): Promise<void> {
    var deferred = new Promise<void>(async (resolve, reject) => {

      try {
        let sub = await subscriptionCollection.create(subscription);
        subscription.id = sub.id;
        resolve();
      }
      catch(err) {
        reject(err);
      }
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
                  },
                  include: [Workflow]
              });

              let result = new Array<EventSubscription>();
              for (let instance of instances) {
                  let event = new EventSubscription();

                  event.id = instance.id;
                  event.workflowId = instance.workflowId;
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
    var deferred = new Promise<string>(async (resolve, reject) => {
      try {
        let evnt = await eventCollection.create(event);
        event.id = evnt.id;
        resolve(event.id);
      }
      catch(err) {
        reject(err);
      }
    });
    return deferred;
  }
  public async getEvent(id: string): Promise<Event> {
    var deferred = new Promise<Event>(async (resolve, reject) => {
        try {
            let event = await eventCollection.findById(id);
            resolve(event.get({plain: true}));
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
                    eventTime: { $lt: new Date() }
                },
                attributes: ['id']
            });
            var result = [];
            for (let event of events) {
                result.push(event.id);
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
    console.log(`markEventProcessed(id:${id})`);
      var deferred = new Promise<void>(async (resolve, reject) => {
          try {
            var event = await eventCollection.findByPrimary(id);
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
          var event = await eventCollection.findById(id);
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
                      eventTime: { $gt: asOf }
                  },
                  attributes: ['id']
              });
              var result = [];
              for (let event of events) {
                  result.push(event.id);
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
