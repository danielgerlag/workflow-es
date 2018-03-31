import { WorkflowDefinition, StepOutcome, WorkflowStepBase, ExecutionPointer, ExecutionResult } from "../models";

export interface IExecutionPointerFactory {
    buildGenesisPointer(defintion: WorkflowDefinition): ExecutionPointer;
    buildNextPointer(pointer: ExecutionPointer, outcomeTarget: StepOutcome): ExecutionPointer;
    buildChildPointer(pointer: ExecutionPointer, childId: number, branch: any): ExecutionPointer;
    buildCompensationPointer(pointer: ExecutionPointer, exceptionPointer: ExecutionPointer, compensationStepId: number): ExecutionPointer;
}