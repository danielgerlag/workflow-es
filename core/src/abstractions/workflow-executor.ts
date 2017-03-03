import { WorkflowInstance } from "../models";

export interface IWorkflowExecutor {
    execute(instance: WorkflowInstance): Promise<void>;
}