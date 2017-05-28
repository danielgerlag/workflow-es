import { WorkflowInstance } from "./workflow-instance";
import { WorkflowStepBase } from "./workflow-step";
import { ExecutionPointer } from "./execution-pointer";

export class StepExecutionContext {
    public workflow: WorkflowInstance;
    public step: WorkflowStepBase;
    public pointer: ExecutionPointer;
    public persistenceData: any;
    public item: any;
}