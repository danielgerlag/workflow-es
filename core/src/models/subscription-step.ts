import { WorkflowStep } from "./workflow-step";
import { SubscriptionStepBody } from "./subscription-step-body";

export class SubscriptionStep extends WorkflowStep<SubscriptionStepBody> {
    public eventKey: string;
    public eventName: string;
}