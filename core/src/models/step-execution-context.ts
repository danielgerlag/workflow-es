import { WorkflowInstance } from "./workflow-instance";
import { WorkflowStepBase } from "./workflow-step";

export class StepExecutionContext {
    public workflow: WorkflowInstance;
    public step: WorkflowStepBase;
    public persistenceData: any;
}