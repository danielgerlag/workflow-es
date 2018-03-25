import { StepBody, InlineStepBody } from "../abstractions";
import { WorkflowDefinition, WorkflowStepBase, WorkflowStep, StepOutcome, StepExecutionContext, ExecutionResult, WorkflowErrorHandling } from "../models";
import { WorkflowBuilder } from "./workflow-builder";
import { StepBuilder } from "./step-builder";

export class ReturnStepBuilder<TData, TStepBody extends StepBody, TParent extends StepBody> {

    private workflowBuilder: WorkflowBuilder<TData>;
    private referenceBuilder: StepBuilder<TParent, TData>;
    private step: WorkflowStep<TStepBody>;

    constructor(workflowBuilder: WorkflowBuilder<TData>, step: WorkflowStep<TStepBody>, parent: StepBuilder<TParent, TData>) {
        this.workflowBuilder = workflowBuilder;
        this.step = step;
        this.referenceBuilder = parent;
    }

    public do(builder: (then: WorkflowBuilder<TData>) => void): StepBuilder<TParent, TData> {
        builder(this.workflowBuilder);
        this.step.children.push(this.step.id + 1); //TODO: make more elegant                        

        return this.referenceBuilder;
    }
}