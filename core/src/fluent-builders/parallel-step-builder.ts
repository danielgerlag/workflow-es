import { StepBody, InlineStepBody } from "../abstractions";
import { WorkflowDefinition, WorkflowStepBase, WorkflowStep, StepOutcome, StepExecutionContext, ExecutionResult, WorkflowErrorHandling } from "../models";
import { WorkflowBuilder } from "./workflow-builder";
import { StepBuilder } from "./step-builder";
import { Sequence } from "../primitives";

export class ParallelStepBuilder<TData, TStepBody extends StepBody> {

    private workflowBuilder: WorkflowBuilder<TData>;
    private referenceBuilder: StepBuilder<Sequence, TData>;
    private step: WorkflowStep<TStepBody>;

    constructor(workflowBuilder: WorkflowBuilder<TData>, step: WorkflowStep<TStepBody>, refBuilder: StepBuilder<Sequence, TData>) {
        this.workflowBuilder = workflowBuilder;
        this.step = step;
        this.referenceBuilder = refBuilder;
    }

    public do(builder: (then: WorkflowBuilder<TData>) => void): ParallelStepBuilder<TData, TStepBody> {
        let lastStep = this.workflowBuilder.lastStep();
        builder(this.workflowBuilder);
        this.step.children.push(lastStep + 1); //TODO: make more elegant
        return this;
    }

    public join(): StepBuilder<Sequence, TData> {
        return this.referenceBuilder;
    }
}