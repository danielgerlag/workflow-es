import { injectable, inject } from "inversify";
import { IExecutionPointerFactory, ILogger, IWorkflowRegistry, IWorkflowExecutor, TYPES, IExecutionResultProcessor } from "../abstractions";
import { WorkflowHost } from "./workflow-host";
import { WorkflowDefinition, ExecutionPointer, EventSubscription, StepOutcome, ExecutionResult, StepExecutionContext, WorkflowStepBase, WorkflowStatus, ExecutionError, WorkflowErrorHandling, ExecutionPipelineDirective, WorkflowExecutorResult } from "../models";

@injectable()
export class ExecutionPointerFactory implements IExecutionPointerFactory {
            
    public buildGenesisPointer(defintion: WorkflowDefinition): ExecutionPointer {
        let result = new ExecutionPointer();
        result.active = true;
        result.stepId = 0;
        result.id = this.generatePointerId();

        return result;
    }

    public buildNextPointer(pointer: ExecutionPointer, outcomeTarget: StepOutcome): ExecutionPointer {
        let result = new ExecutionPointer();
        result.active = true;
        result.stepId = outcomeTarget.nextStep;
        result.id = this.generatePointerId();
        result.predecessorId = pointer.id;
        result.contextItem = pointer.contextItem;        

        return result;
    }

    public buildChildPointer(pointer: ExecutionPointer, childId: number, branch: any): ExecutionPointer {
        let result = new ExecutionPointer();
        result.active = true;
        result.id = this.generatePointerId();
        result.predecessorId = pointer.id;
        result.stepId = childId;        
        result.contextItem = branch;
        
        pointer.children.push(result.id);

        return result;
    }

    generatePointerId(): string {
        return (Math.random() * 0x10000000000000).toString(16);
    }
    
}