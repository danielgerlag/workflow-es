import { Promise } from "es6-promise";
import { EventPublication } from "../models";

export interface IQueueProvider {
    queueForProcessing(workflowId: string): Promise<void>;
    dequeueForProcessing(): Promise<string>;
    queueForPublish(publication: EventPublication): Promise<void>;
    dequeueForPublish(): Promise<EventPublication>;
}
