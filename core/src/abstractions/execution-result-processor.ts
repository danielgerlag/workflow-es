import { WorkflowInstance, WorkflowDefinition, WorkflowExecutorResult, WorkflowStepBase, ExecutionPointer, ExecutionResult } from "../models";

export interface IExecutionResultProcessor {
    processExecutionResult(stepResult: ExecutionResult, pointer: ExecutionPointer, instance: WorkflowInstance, step: WorkflowStepBase, workflowResult: WorkflowExecutorResult);
    handleStepException(workflow: WorkflowInstance, definition: WorkflowDefinition, pointer: ExecutionPointer, step: WorkflowStepBase);
}