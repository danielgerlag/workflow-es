import { ExecutionResult, StepExecutionContext } from "../models";
import { injectable } from "inversify";

@injectable()
export abstract class StepBody {

    public abstract run(context: StepExecutionContext): Promise<ExecutionResult>;

} 