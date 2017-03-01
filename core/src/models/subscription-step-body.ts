import { ExecutionResult, StepExecutionContext } from "../models";
import { StepBody } from "../abstractions";

export class SubscriptionStepBody extends StepBody {

    public eventData: any;

    public run(context: StepExecutionContext): Promise<ExecutionResult> {
        return ExecutionResult.resolveNext();        
    }

}