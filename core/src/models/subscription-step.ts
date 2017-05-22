import { WorkflowStep } from "./workflow-step";
import { SubscriptionStepBody } from "./subscription-step-body";

export class SubscriptionStep extends WorkflowStep<SubscriptionStepBody> {
    public eventKey: (data: any) => any;
    public eventName: string;
}