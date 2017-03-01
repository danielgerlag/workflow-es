import { ExecutionResult, StepExecutionContext } from "../models";

export abstract class StepBody {

    public abstract run(context: StepExecutionContext): Promise<ExecutionResult>;

} 