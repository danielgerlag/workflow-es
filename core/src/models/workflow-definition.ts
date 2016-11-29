import { WorkflowStepBase } from "./workflow-step";

export class WorkflowDefinition {
    public id : string;
    public version: number;
    public description: string;
    public initialStep: number;
    public steps: Array<WorkflowStepBase> = [];

}