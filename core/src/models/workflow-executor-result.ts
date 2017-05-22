import { EventSubscription } from './event-subscription';
import { ExecutionError } from './execution-error';

export class WorkflowExecutorResult {
    public subscriptions : Array<EventSubscription> = [];
    public errors : Array<ExecutionError> = [];
}