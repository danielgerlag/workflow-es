import { StepBody, InlineStepBody } from "../abstractions";
import { WorkflowDefinition, WorkflowStepBase, WorkflowStep, StepOutcome, StepExecutionContext, ExecutionResult, SubscriptionStep, SubscriptionStepBody, WorkflowErrorHandling } from "../models";

export class WorkflowBuilder<TData> {
    
    private steps: Array<WorkflowStepBase> = [];
    public initialStep: number = null;    
    public errorBehavior : number = WorkflowErrorHandling.Retry;
    public retryInterval : number = (60 * 1000);

    public build(id: string, version: number): WorkflowDefinition {
        var result = new WorkflowDefinition();
        result.id = id;
        result.version = version;
        result.steps = this.steps;
        result.initialStep = this.initialStep;
        result.errorBehavior = this.errorBehavior;
        result.retryInterval = this.retryInterval;

        return result;
    }  

    public addStep(step: WorkflowStepBase) {
        step.id = this.steps.length;
        this.steps.push(step);
    }

    public startWith<TNewStepBody extends StepBody>(body: { new(): TNewStepBody; }, setup: (step: StepBuilder<TNewStepBody, TData>) => void = null): StepBuilder<TNewStepBody, TData> {
        var step = new WorkflowStep<TNewStepBody>();
        step.body = body;
        var stepBuilder = new StepBuilder<TNewStepBody, TData>(this, step);

        //setup
        if (setup) {
            setup(stepBuilder);
        }
        
        this.addStep(step);
        this.initialStep = step.id;
        return stepBuilder;
    }

    public getUpstreamSteps(id: number): Array<WorkflowStepBase> {
        return this.steps.filter(step => step.outcomes.filter(outcome => outcome.nextStep == id).length > 0);
    }
}

export class StepBuilder<TStepBody extends StepBody, TData> {

    private workflowBuilder: WorkflowBuilder<TData>;
    public step: WorkflowStep<TStepBody>;

    constructor(workflowBuilder: WorkflowBuilder<TData>, step: WorkflowStep<TStepBody>) {
        this.workflowBuilder = workflowBuilder;
        this.step = step;
    }

    public name(name: string): StepBuilder<TStepBody, TData> {
        this.step.name = name;
        return this;
    }

    public then<TNewStepBody extends StepBody>(body: { new(): TNewStepBody; }, setup: (step: StepBuilder<TNewStepBody, TData>) => void = null): StepBuilder<TNewStepBody, TData> {
        var newStep = new WorkflowStep<TNewStepBody>();
        newStep.body = body;
        this.workflowBuilder.addStep(newStep);
        var stepBuilder = new StepBuilder<TNewStepBody, TData>(this.workflowBuilder, newStep);

        //setup
        if (setup) {
            setup(stepBuilder);
        }

        var outcome = new StepOutcome();
        outcome.nextStep = newStep.id;
        outcome.value = null;
        this.step.outcomes.push(outcome);
                
        return stepBuilder;
    }

    public thenStep<TNewStepBody extends StepBody>(newStep: StepBuilder<TNewStepBody, TData>): StepBuilder<TNewStepBody, TData> {
        var outcome = new StepOutcome();
        outcome.nextStep = newStep.step.id;
        outcome.value = null;
        this.step.outcomes.push(outcome);
                
        return newStep;
    }

    public thenRun(step: (context: StepExecutionContext) => Promise<ExecutionResult>): StepBuilder<InlineStepBody, TData> {
        var newStep = new WorkflowStep<InlineStepBody>();
        
        class bodyClass extends InlineStepBody {
            constructor() {
                super(step)
            }
        };
        
        newStep.body = bodyClass;
        this.workflowBuilder.addStep(newStep);
        var stepBuilder = new StepBuilder<InlineStepBody, TData>(this.workflowBuilder, newStep);
        
        var outcome = new StepOutcome();
        outcome.nextStep = newStep.id;
        outcome.value = null;
        this.step.outcomes.push(outcome);
                
        return stepBuilder;
    }

    public when(outcomeValue: any): OutcomeBuilder<TData> {
        var outcome = new StepOutcome();
        outcome.value = outcomeValue;
        this.step.outcomes.push(outcome);
        var outcomeBuilder = new OutcomeBuilder<TData>(this.workflowBuilder, outcome);
        return outcomeBuilder;
    }

    public input(expression: (step: TStepBody, data: TData) => void): StepBuilder<TStepBody, TData> {
        this.step.inputs.push(expression);
        return this;
    }

    public output(expression: (step: TStepBody, data: TData) => void): StepBuilder<TStepBody, TData> {
        this.step.outputs.push(expression);
        return this;
    }

    public waitFor(eventName: string, eventKey: string): StepBuilder<SubscriptionStepBody, TData> {
        var newStep = new SubscriptionStep();
        newStep.eventName = eventName;
        newStep.eventKey = eventKey;
        newStep.body = SubscriptionStepBody;
        this.workflowBuilder.addStep(newStep);
        var outcome = new StepOutcome();
        outcome.nextStep = newStep.id;
        outcome.value = null;
        this.step.outcomes.push(outcome);
        var stepBuilder = new StepBuilder<SubscriptionStepBody, TData>(this.workflowBuilder, newStep);
        return stepBuilder;
    }

    public end<TNewStepBody extends StepBody>(stepName: string): StepBuilder<TNewStepBody, TData> {
        var ancestor: any = this.iterateParents(this.step.id, stepName);

        if (!ancestor)
            throw "Parent step of name " + stepName + " not found";
        
        return new StepBuilder<TNewStepBody, TData>(this.workflowBuilder, ancestor);
    }

    public onError(behavior: number, retryInterval: number = null): StepBuilder<TStepBody, TData> {
        this.step.errorBehavior = behavior;
        this.step.retryInterval = retryInterval;
        return this;
    }

    private iterateParents(id: number, name: string): WorkflowStepBase {
        var upstream = this.workflowBuilder.getUpstreamSteps(id);
        
        for (let parent of upstream) {
            if (parent.name == name)
                return parent;
        }

        for (let parent of upstream) {
            var result = this.iterateParents(parent.id, name);
            if (result)
                return result;
        }

        return null;
    }

}



export class OutcomeBuilder<TData> {

    private workflowBuilder: WorkflowBuilder<TData>;
    private outcome: StepOutcome;

    constructor(workflowBuilder: WorkflowBuilder<TData>, outcome: StepOutcome) {
        this.workflowBuilder = workflowBuilder;
        this.outcome = outcome;
    }

    public then<TNewStepBody extends StepBody>(body: { new(): TNewStepBody; }, setup: (step: StepBuilder<TNewStepBody, TData>) => void = null): StepBuilder<TNewStepBody, TData> {
        var newStep = new WorkflowStep<TNewStepBody>();
        newStep.body = body;
        this.workflowBuilder.addStep(newStep);
        var stepBuilder = new StepBuilder<TNewStepBody, TData>(this.workflowBuilder, newStep);

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
        var newStep = new WorkflowStep<InlineStepBody>();
        
        class bodyClass extends InlineStepBody {
            constructor() {
                super(step)
            }
        };
        
        newStep.body = bodyClass;
        this.workflowBuilder.addStep(newStep);
        var stepBuilder = new StepBuilder<InlineStepBody, TData>(this.workflowBuilder, newStep);
        this.outcome.nextStep = newStep.id;        
        return stepBuilder;
    }



}