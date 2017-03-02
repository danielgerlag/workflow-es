import { StepBody } from "./step-body";
import { ExecutionResult, StepExecutionContext } from "../models";

export class InlineStepBody extends StepBody {

    private func: (context: StepExecutionContext) => Promise<ExecutionResult>; 

    constructor(func: (context: StepExecutionContext) => Promise<ExecutionResult>) {
        super();
        this.func = func;
    }
    
    public run(context: StepExecutionContext): Promise<ExecutionResult> {
        return this.func(context);
    }

} 