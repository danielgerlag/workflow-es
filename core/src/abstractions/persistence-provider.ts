import { WorkflowInstance, EventSubscription, EventPublication } from "../models";

export interface IPersistenceProvider {

    createNewWorkflow(instance: WorkflowInstance): Promise<string>;
    persistWorkflow(instance: WorkflowInstance): Promise<void>;
    getWorkflowInstance(workflowId: string): Promise<WorkflowInstance>;
    getRunnableInstances(): Promise<Array<string>>;

    createEventSubscription(subscription: EventSubscription): Promise<void>;
    getSubscriptions(eventName: string, eventKey: string): Promise<Array<EventSubscription>>;
    terminateSubscription(id: string): Promise<void>;

    createUnpublishedEvent(publication: EventPublication): Promise<void>;
    getUnpublishedEvents(): Promise<Array<EventPublication>>;
    removeUnpublishedEvent(id: string): Promise<void>;

}