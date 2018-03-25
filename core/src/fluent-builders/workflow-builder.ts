import { StepBody, InlineStepBody } from "../abstractions";
import { WorkflowDefinition, WorkflowStepBase, WorkflowStep, StepOutcome, StepExecutionContext, ExecutionResult, WorkflowErrorHandling } from "../models";
import { WaitFor, Foreach, While, If, Delay, Schedule } from "../primitives";
import { StepBuilder } from "./step-builder";

export class WorkflowBuilder<TData> {
    
    private steps: Array<WorkflowStepBase> = [];
    public errorBehavior : number = WorkflowErrorHandling.Retry;
    public retryInterval : number = (60 * 1000);

    public build(id: string, version: number): WorkflowDefinition {
        var result = new WorkflowDefinition();
        result.id = id;
        result.version = version;
        result.steps = this.steps;
        result.errorBehavior = this.errorBehavior;
        result.retryInterval = this.retryInterval;

        return result;
    }  

    public addStep(step: WorkflowStepBase) {
        step.id = this.steps.length;
        this.steps.push(step);
    }

    public startWith<TNewStepBody extends StepBody>(body: { new(): TNewStepBody; }, setup: (step: StepBuilder<TNewStepBody, TData>) => void = null): StepBuilder<TNewStepBody, TData> {
        let step = new WorkflowStep<TNewStepBody>();
        step.body = body;
        let stepBuilder = new StepBuilder<TNewStepBody, TData>(this, step);

        //setup
        if (setup) {
            setup(stepBuilder);
        }
        
        this.addStep(step);
        return stepBuilder;
    }

    public getUpstreamSteps(id: number): Array<WorkflowStepBase> {
        return this.steps.filter(step => step.outcomes.filter(outcome => outcome.nextStep == id).length > 0);
    }
}