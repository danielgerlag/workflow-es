import { Promise } from "es6-promise";
import { WorkflowInstance } from "../models";

export interface IWorkflowExecutor {
    Execute(instance: WorkflowInstance): Promise<void>;
}