import { StepBody } from "../abstractions";
import { StepOutcome } from "./step-outcome";

export abstract class WorkflowStepBase {
    public id : number;    
    public name: string;

    public abstract body: { new(): StepBody; };
    public outcomes: Array<StepOutcome> = [];


    public inputs: Array<(step: StepBody, data: any) => void>;
    public outputs: Array<(step: StepBody, data: any) => void>;
    
}

export class WorkflowStep<T extends StepBody> extends WorkflowStepBase {
    
    public body: { new(): T; };
    
    public inputs: Array<(step: T, data: any) => void> = [];
    public outputs: Array<(step: T, data: any) => void> = [];
    
}