import { WorkflowInstance } from "../models";

export interface IWorkflowExecutor {
    Execute(instance: WorkflowInstance): Promise<void>;
}