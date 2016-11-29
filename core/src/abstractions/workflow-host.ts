import { Promise } from "es6-promise";
import { WorkflowInstance, WorkflowStatus, ExecutionPointer, EventSubscription, EventPublication } from "../models";
import { WorkflowBase, IPersistenceProvider, IQueueProvider, IDistributedLockProvider, IWorkflowExecutor, ILogger } from "../abstractions";

export interface IWorkflowHost {

    usePersisence(provider: IPersistenceProvider);
    useLogger(logger: ILogger);

    start(): Promise<void>;
    stop();
    startWorkflow(id: string, version: number, data: any): Promise<string>;    
    registerWorkflow<TData>(workflow: WorkflowBase<TData>);
    subscribeEvent(workflowId: string, stepId: number, eventName: string, eventKey: string): Promise<void>;    
    publishEvent(eventName: string, eventKey: string, eventData: any): Promise<void>;
    suspendWorkflow(id: string): Promise<boolean>;
    resumeWorkflow(id: string): Promise<boolean>;
    terminateWorkflow(id: string): Promise<boolean>;

}