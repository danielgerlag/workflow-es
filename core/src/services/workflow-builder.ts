import { StepBody, InlineStepBody } from "../abstractions";
import { WorkflowDefinition, WorkflowStepBase, WorkflowStep, StepOutcome, StepExecutionContext, ExecutionResult, WorkflowErrorHandling } from "../models";
import { SubscriptionStep, SubscriptionStepBody, Foreach, While, If, Delay, Schedule } from "../primitives";

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
        let newStep = new WorkflowStep<TNewStepBody>();
        newStep.body = body;
        this.workflowBuilder.addStep(newStep);
        let stepBuilder = new StepBuilder<TNewStepBody, TData>(this.workflowBuilder, newStep);

        //setup
        if (setup) {
            setup(stepBuilder);
        }

        let outcome = new StepOutcome();
        outcome.nextStep = newStep.id;
        outcome.value = x => null;
        this.step.outcomes.push(outcome);
                
        return stepBuilder;
    }

    public thenStep<TNewStepBody extends StepBody>(newStep: StepBuilder<TNewStepBody, TData>): StepBuilder<TNewStepBody, TData> {
        let outcome = new StepOutcome();
        outcome.nextStep = newStep.step.id;
        outcome.value = x => null;
        this.step.outcomes.push(outcome);
                
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
        
        let outcome = new StepOutcome();
        outcome.nextStep = newStep.id;
        outcome.value = x => null;
        this.step.outcomes.push(outcome);
                
        return stepBuilder;
    }

    public when(outcomeValue: (data: TData) => any): OutcomeBuilder<TData> {
        let outcome = new StepOutcome();
        outcome.value = outcomeValue;
        this.step.outcomes.push(outcome);
        let outcomeBuilder = new OutcomeBuilder<TData>(this.workflowBuilder, outcome);
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

    public waitFor(eventName: string, eventKey: (data: TData) => any, effectiveDate: (data: TData) => Date = x => new Date()): StepBuilder<SubscriptionStepBody, TData> {
        let newStep = new SubscriptionStep();
        newStep.eventName = eventName;
        newStep.eventKey = eventKey;
        newStep.effectiveDate = effectiveDate;
        newStep.body = SubscriptionStepBody;
        this.workflowBuilder.addStep(newStep);
        let outcome = new StepOutcome();
        outcome.nextStep = newStep.id;
        outcome.value = x => null;
        this.step.outcomes.push(outcome);
        let stepBuilder = new StepBuilder<SubscriptionStepBody, TData>(this.workflowBuilder, newStep);
        return stepBuilder;
    }

    public end<TNewStepBody extends StepBody>(stepName: string): StepBuilder<TNewStepBody, TData> {
        let ancestor: any = this.iterateParents(this.step.id, stepName);

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
        let upstream = this.workflowBuilder.getUpstreamSteps(id);
        
        for (let parent of upstream) {
            if (parent.name == name)
                return parent;
        }

        for (let parent of upstream) {
            let result = this.iterateParents(parent.id, name);
            if (result)
                return result;
        }

        return null;
    }

    public foreach(expression: (data :TData) => any[]): StepBuilder<Foreach, TData> {
        let newStep = new WorkflowStep<Foreach>();
        newStep.body = Foreach;
        newStep.inputs.push((step: Foreach, data: any) => step.collection = expression(data));
        this.workflowBuilder.addStep(newStep);
        
        let stepBuilder = new StepBuilder<Foreach, TData>(this.workflowBuilder, newStep);

        let outcome = new StepOutcome();
        outcome.nextStep = newStep.id;
        this.step.outcomes.push(outcome);

        return stepBuilder;
    }

    public while(expression: (data :TData) => boolean): StepBuilder<While, TData> {
        let newStep = new WorkflowStep<While>();
        newStep.body = While;
        newStep.inputs.push((step: While, data: any) => step.condition = expression(data));
        this.workflowBuilder.addStep(newStep);
        
        let stepBuilder = new StepBuilder<While, TData>(this.workflowBuilder, newStep);

        let outcome = new StepOutcome();
        outcome.nextStep = newStep.id;
        this.step.outcomes.push(outcome);

        return stepBuilder;
    }

    public if(expression: (data :TData) => boolean): StepBuilder<If, TData> {
        let newStep = new WorkflowStep<If>();
        newStep.body = If;
        newStep.inputs.push((step: If, data: any) => step.condition = expression(data));
        this.workflowBuilder.addStep(newStep);
        
        let stepBuilder = new StepBuilder<If, TData>(this.workflowBuilder, newStep);

        let outcome = new StepOutcome();
        outcome.nextStep = newStep.id;
        this.step.outcomes.push(outcome);

        return stepBuilder;
    }

    public schedule(interval: (data :TData) => number): StepBuilder<Schedule, TData> {
        let newStep = new WorkflowStep<Schedule>();
        newStep.body = Schedule;
        newStep.inputs.push((step: Schedule, data: any) => step.interval = interval(data));
        this.workflowBuilder.addStep(newStep);
        
        let stepBuilder = new StepBuilder<Schedule, TData>(this.workflowBuilder, newStep);

        let outcome = new StepOutcome();
        outcome.nextStep = newStep.id;
        this.step.outcomes.push(outcome);

        return stepBuilder;
    }

    public delay(milliseconds: (data :TData) => number): StepBuilder<Delay, TData> {
        let newStep = new WorkflowStep<Delay>();
        newStep.body = Delay;
        newStep.inputs.push((step: Delay, data: any) => step.milliseconds = milliseconds(data));
        this.workflowBuilder.addStep(newStep);
        
        let stepBuilder = new StepBuilder<Delay, TData>(this.workflowBuilder, newStep);

        let outcome = new StepOutcome();
        outcome.nextStep = newStep.id;
        this.step.outcomes.push(outcome);

        return stepBuilder;
    }

    public do(builder: (then: WorkflowBuilder<TData>) => void): StepBuilder<TStepBody, TData> {
        builder(this.workflowBuilder);
        this.step.children.push(this.step.id + 1); //TODO: make more elegant                        

        return this;
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