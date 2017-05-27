import { EventSubscription, ExecutionResult, StepExecutionContext, ExecutionPointer, WorkflowInstance, WorkflowDefinition, WorkflowStep, StepOutcome, ExecutionPipelineDirective, WorkflowExecutorResult } from "../models";
import { SubscriptionStepBody } from "./subscription-step-body";
import { StepBody } from "../abstractions";

export class SubscriptionStep extends WorkflowStep<SubscriptionStepBody> {
    public eventKey: (data: any) => any;
    public eventName: string;
    public effectiveDate: (data: any) => Date;

    public initForExecution(executorResult: WorkflowExecutorResult, definition: WorkflowDefinition, workflow: WorkflowInstance, executionPointer: ExecutionPointer): any {
        if (!executionPointer.eventPublished) {
            if (this.eventKey != null)
                executionPointer.eventKey = this.eventKey(workflow.data);

            let effDate: Date = new Date(2000, 1, 1);

            if (this.effectiveDate)
                effDate = this.effectiveDate(workflow.data);

            executionPointer.eventName = this.eventName;
            executionPointer.active = false;

            let sub = new EventSubscription();
            sub.workflowId = workflow.id;
            sub.stepId = executionPointer.stepId;
            sub.eventName = executionPointer.eventName;
            sub.eventKey = executionPointer.eventKey;
            sub.subscribeAsOf = effDate;
            executorResult.subscriptions.push(sub);
            
            return ExecutionPipelineDirective.Defer;
        }
        return ExecutionPipelineDirective.Next;
    }

    public beforeExecute(executorResult: WorkflowExecutorResult, context: StepExecutionContext, executionPointer: ExecutionPointer, body: StepBody): any {
        if (executionPointer.eventPublished) {
            let subBody = (body as SubscriptionStepBody);
            subBody.eventData = executionPointer.eventData;            
        }
        return ExecutionPipelineDirective.Next;
    }
}