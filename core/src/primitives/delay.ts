import { ExecutionResult, StepExecutionContext } from "../models";
import { StepBody } from "../abstractions";

export class Delay extends StepBody {

    public milliseconds: number;

    public run(context: StepExecutionContext): Promise<ExecutionResult> {

        if (context.persistenceData) {
            return ExecutionResult.next();
        }
        
        return ExecutionResult.sleep(new Date(new Date().getTime() + this.milliseconds), true);
    }
}