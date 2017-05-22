import { WorkflowInstance, WorkflowExecutorResult } from "../models";

export interface IWorkflowExecutor {
    execute(instance: WorkflowInstance): Promise<WorkflowExecutorResult>;
}