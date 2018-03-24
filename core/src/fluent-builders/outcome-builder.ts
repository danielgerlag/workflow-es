import { StepBody, InlineStepBody } from "../abstractions";
import { WorkflowDefinition, WorkflowStepBase, WorkflowStep, StepOutcome, StepExecutionContext, ExecutionResult, WorkflowErrorHandling } from "../models";
import { WaitFor, Foreach, While, If, Delay, Schedule } from "../primitives";
import { StepBuilder } from "./step-builder";
import { WorkflowBuilder } from "./workflow-builder";

export class OutcomeBuilder<TData> {

    private workflowBuilder: WorkflowBuilder<TData>;
    private outcome: StepOutcome;

    constructor(workflowBuilder: WorkflowBuilder<TData>, outcome: StepOutcome) {
        this.workflowBuilder = workflowBuilder;
        this.outcome = outcome;
    }

    public then<TNewStepBody extends StepBody>(body: { new(): TNewStepBody; }, setup: (step: StepBuilder<TNewStepBody, TData>) => void = null): StepBuilder<TNewStepBody, TData> {
        let newStep = new WorkflowStep<TNewStepBody>();
        newStep.body = body;
        this.workflowBuilder.addStep(newStep);
        let stepBuilder = new StepBuilder<TNewStepBody, TData>(this.workflowBuilder, newStep);

        //setup
        if (setup) {
            setup(stepBuilder);
        }
        
        this.outcome.nextStep = newStep.id;
        return stepBuilder;
    }

    public thenStep<TNewStepBody extends StepBody>(newStep: StepBuilder<TNewStepBody, TData>): StepBuilder<TNewStepBody, TData> {
        this.outcome.nextStep = newStep.step.id;
        return newStep;
    }

    public thenRun(step: (context: StepExecutionContext) => Promise<ExecutionResult>): StepBuilder<InlineStepBody, TData> {
        let newStep = new WorkflowStep<InlineStepBody>();
        
        class bodyClass extends InlineStepBody {
            constructor() {
                super(step)
            }
        };
        
        newStep.body = bodyClass;
        this.workflowBuilder.addStep(newStep);
        let stepBuilder = new StepBuilder<InlineStepBody, TData>(this.workflowBuilder, newStep);
        this.outcome.nextStep = newStep.id;        
        return stepBuilder;
    }
}