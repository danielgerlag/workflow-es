
export var QueueType = {
    Workflow : 0,
    Event : 1
}

export interface IQueueProvider {
    queueForProcessing(workflowId: string, queue: any): Promise<void>;
    dequeueForProcessing(queue: any): Promise<string>;
}
