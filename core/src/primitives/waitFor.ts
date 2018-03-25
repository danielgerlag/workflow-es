import { ExecutionResult, StepExecutionContext } from "../models";
import { StepBody } from "../abstractions";

export class WaitFor extends StepBody {

    public eventName: string;
    public eventKey: string;
    public effectiveDate: Date;
    public eventData: any;

    public run(context: StepExecutionContext): Promise<ExecutionResult> {

        if (!context.pointer.eventPublished) {
            let effDate: Date = new Date(2000, 1, 1);

            if (this.effectiveDate)
                effDate = this.effectiveDate;

            return ExecutionResult.waitForEvent(this.eventName, this.eventKey, effDate);
        }
        
        this.eventData = context.pointer.eventData;
        return ExecutionResult.next();
    }
}