import { injectable, inject } from "inversify";
import { IPersistenceProvider, ILogger, IWorkflowRegistry, IWorkflowExecutor, TYPES, IExecutionResultProcessor, IExecutionPointerFactory } from "../abstractions";
import { WorkflowHost } from "./workflow-host";
import { WorkflowInstance, ExecutionPointer, PointerStatus, ExecutionResult, WorkflowDefinition, StepExecutionContext, WorkflowStepBase, WorkflowStatus, ExecutionError, WorkflowErrorHandling, ExecutionPipelineDirective, WorkflowExecutorResult, EventSubscription } from "../models";
import { worker } from "cluster";

@injectable()
export class ExecutionResultProcessor implements IExecutionResultProcessor {
    
    @inject(TYPES.IExecutionPointerFactory)
    private pointerFactory : IExecutionPointerFactory;

    @inject(TYPES.ILogger)
    private logger : ILogger;
        
    public processExecutionResult(stepResult: ExecutionResult, pointer: ExecutionPointer, instance: WorkflowInstance, step: WorkflowStepBase, workflowResult: WorkflowExecutorResult) {

        pointer.persistenceData = stepResult.persistenceData;
        pointer.outcome = stepResult.outcomeValue;
        if (stepResult.sleep) {
            pointer.sleepUntil = stepResult.sleep.getTime();
            pointer.status = PointerStatus.Sleeping;
        }

        if (stepResult.eventName) {
            pointer.eventName = stepResult.eventName;
            pointer.eventKey = stepResult.eventKey;
            pointer.active = false;
            pointer.status = PointerStatus.WaitingForEvent;

            let subscription = new EventSubscription();
            subscription.workflowId = instance.id;
            subscription.stepId = pointer.stepId;
            subscription.eventName = pointer.eventName;
            subscription.eventKey = pointer.eventKey;
            subscription.subscribeAsOf = stepResult.eventAsOf;

            workflowResult.subscriptions.push(subscription);
        }

        if (stepResult.proceed) {
            pointer.active = false;
            pointer.status = PointerStatus.Complete;
            pointer.endTime = new Date();
            
            for (let outcome of step.outcomes.filter(x => (x.value(instance.data) == stepResult.outcomeValue) || (x.value(instance.data) == null))) {
                let newPointer = this.pointerFactory.buildNextPointer(pointer, outcome);                
                instance.executionPointers.push(newPointer);
            }
        }
        else {
            for (let branch of stepResult.branchValues) {
                for (let childDefId of step.children) {                    
                    let childPointer = this.pointerFactory.buildChildPointer(pointer, childDefId, branch);
                    instance.executionPointers.push(childPointer);
                }
            }
        }
    }

    public handleStepException(workflow: WorkflowInstance, definition: WorkflowDefinition, pointer: ExecutionPointer, step: WorkflowStepBase) {
        pointer.status = PointerStatus.Failed;            
        let compensatingStepId = this.findScopeCompensationStepId(workflow, definition, pointer);
        let errorOption = step.errorBehavior;
        if (!errorOption) {
            if (compensatingStepId !== undefined)
                errorOption = WorkflowErrorHandling.Compensate;
            else
                errorOption = definition.errorBehavior;
        }
        this.selectErrorStrategy(errorOption, workflow, definition, pointer, step);
    }

    selectErrorStrategy(errorOption: number, workflow: WorkflowInstance, definition: WorkflowDefinition, pointer: ExecutionPointer, step: WorkflowStepBase) {
        
        switch (errorOption) {
            case WorkflowErrorHandling.Retry:
                pointer.sleepUntil = (Date.now() + step.retryInterval);
                step.primeForRetry(pointer);
                break;
            case WorkflowErrorHandling.Suspend:
                workflow.status = WorkflowStatus.Suspended;
                break;
            case WorkflowErrorHandling.Terminate:
                workflow.status = WorkflowStatus.Terminated;
                break;
            case WorkflowErrorHandling.Compensate:
                this.compensate(workflow, definition, pointer);
                break;
            default:
                pointer.sleepUntil = (Date.now() + 60000);
                break;
        }

        pointer.retryCount++;
    }

    compensate(workflow: WorkflowInstance, definition: WorkflowDefinition, exceptionPointer: ExecutionPointer) {
        //todo
    }

    findScopeCompensationStepId(workflow: WorkflowInstance, definition: WorkflowDefinition, currentPointer: ExecutionPointer): number {
        let scope = [];
        if (currentPointer.scope)
            currentPointer.scope.slice();
        
        scope.push(currentPointer.id);

        while (scope.length > 0)
        {
            let pointerId = scope.pop();
            let pointer = workflow.executionPointers.find(x => x.id == pointerId);
            let step = definition.steps.find(x => x.id == pointer.stepId);
            if ((step.compensationStepId !== undefined) && (step.compensationStepId !== null))
                return step.compensationStepId;
        }

        return undefined;
    }

}