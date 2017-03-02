import { IQueueProvider } from "../abstractions";
import { EventPublication } from "../models";

export class SingleNodeQueueProvider implements IQueueProvider {

    private processQueue: Array<string> = [];
    private publishQueue: Array<EventPublication> = [];

    public async queueForProcessing(workflowId: string): Promise<void> {
        this.processQueue.push(workflowId);
    }

    public async dequeueForProcessing(): Promise<string> {
        return this.processQueue.shift();
    }

    public async queueForPublish(publication: EventPublication): Promise<void> {
        this.publishQueue.push(publication);
    }

    public async dequeueForPublish(): Promise<EventPublication> {
        return this.publishQueue.shift();
    }

}