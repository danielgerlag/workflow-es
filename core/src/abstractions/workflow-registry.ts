import { WorkflowDefinition } from "../models";
import { WorkflowBase } from "./workflow-base";

export interface IWorkflowRegistry {
    getDefinition(id: string, version: number) : WorkflowDefinition;
    registerWorkflow<TData>(workflow: WorkflowBase<TData>);
}