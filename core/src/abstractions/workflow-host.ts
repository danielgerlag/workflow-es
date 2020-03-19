import { WorkflowInstance, WorkflowStatus, ExecutionPointer, EventSubscription } from "../models";
import { WorkflowBase, IPersistenceProvider, IQueueProvider, IDistributedLockProvider, IWorkflowExecutor, ILogger } from "../abstractions";

export interface IWorkflowHost {
    start(): Promise<void>;
    stop();
    startWorkflow(id: string, version: number, data: any): Promise<string>;    
    registerWorkflow<TData>(workflow: new () => WorkflowBase<TData>);
    publishEvent(eventName: string, eventKey: string, eventData: any, eventTime?: Date): Promise<void>;
    suspendWorkflow(id: string): Promise<boolean>;
    resumeWorkflow(id: string): Promise<boolean>;
    terminateWorkflow(id: string): Promise<boolean>;
}