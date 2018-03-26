import { injectable, inject } from "inversify";
import { IExecutionPointerFactory, ILogger, IWorkflowRegistry, IWorkflowExecutor, TYPES, IExecutionResultProcessor } from "../abstractions";
import { WorkflowHost } from "./workflow-host";
import { WorkflowDefinition, ExecutionPointer, PointerStatus, EventSubscription, StepOutcome, ExecutionResult, StepExecutionContext, WorkflowStepBase, WorkflowStatus, ExecutionError, WorkflowErrorHandling, ExecutionPipelineDirective, WorkflowExecutorResult } from "../models";

@injectable()
export class ExecutionPointerFactory implements IExecutionPointerFactory {
            
    public buildGenesisPointer(defintion: WorkflowDefinition): ExecutionPointer {
        let result = new ExecutionPointer();
        result.active = true;
        result.stepId = 0;
        result.status = PointerStatus.Pending;
        result.id = this.generatePointerId();

        return result;
    }

    public buildNextPointer(pointer: ExecutionPointer, outcomeTarget: StepOutcome): ExecutionPointer {
        let result = new ExecutionPointer();
        result.active = true;
        result.stepId = outcomeTarget.nextStep;
        result.status = PointerStatus.Pending;
        result.id = this.generatePointerId();
        result.predecessorId = pointer.id;
        result.contextItem = pointer.contextItem;
        if (pointer.scope)
            result.scope = pointer.scope.slice();

        return result;
    }

    public buildChildPointer(pointer: ExecutionPointer, childId: number, branch: any): ExecutionPointer {
        let result = new ExecutionPointer();
        result.active = true;
        result.id = this.generatePointerId();
        result.predecessorId = pointer.id;
        result.status = PointerStatus.Pending;
        result.stepId = childId;        
        result.contextItem = branch;
        if (pointer.scope)
            result.scope = pointer.scope.slice();
        
        result.scope.push(pointer.id);
        pointer.children.push(result.id);
        
        return result;
    }

    public buildCompensationPointer(pointer: ExecutionPointer, exceptionPointer: ExecutionPointer, compensationStepId: number): ExecutionPointer {
        let result = new ExecutionPointer();
        result.active = true;
        result.predecessorId = exceptionPointer.id;
        result.stepId = compensationStepId,
        result.status = PointerStatus.Pending;
        result.id = this.generatePointerId();        
        result.contextItem = pointer.contextItem;
        if (pointer.scope)
            result.scope = pointer.scope.slice();

        return result;
    }

    generatePointerId(): string {
        return (Math.random() * 0x10000000000000).toString(16);
    }
    
}