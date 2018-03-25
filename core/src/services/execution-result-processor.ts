import { injectable, inject } from "inversify";
import { IPersistenceProvider, ILogger, IWorkflowRegistry, IWorkflowExecutor, TYPES, IExecutionResultProcessor, IExecutionPointerFactory } from "../abstractions";
import { WorkflowHost } from "./workflow-host";
import { WorkflowInstance, ExecutionPointer, ExecutionResult, StepExecutionContext, WorkflowStepBase, WorkflowStatus, ExecutionError, WorkflowErrorHandling, ExecutionPipelineDirective, WorkflowExecutorResult, EventSubscription } from "../models";

@injectable()
export class ExecutionResultProcessor implements IExecutionResultProcessor {
    
    @inject(TYPES.IExecutionPointerFactory)
    private pointerFactory : IExecutionPointerFactory;

    @inject(TYPES.ILogger)
    private logger : ILogger;
        
    public processExecutionResult(stepResult: ExecutionResult, pointer: ExecutionPointer, instance: WorkflowInstance, step: WorkflowStepBase, workflowResult: WorkflowExecutorResult) {

        pointer.persistenceData = stepResult.persistenceData;
        pointer.outcome = stepResult.outcomeValue;
        if (stepResult.sleep)
            pointer.sleepUntil = stepResult.sleep.getTime();

        if (stepResult.eventName) {
            pointer.eventName = stepResult.eventName;
            pointer.eventKey = stepResult.eventKey;
            pointer.active = false;
            //pointer.status

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

}