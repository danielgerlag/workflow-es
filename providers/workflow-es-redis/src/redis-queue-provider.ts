import { injectable, inject } from "inversify";
import Redis from "ioredis";
import { IQueueProvider, QueueType, TYPES, ILogger } from "workflow-es";

@injectable()
export class RedisQueueProvider implements IQueueProvider {
    
    private workflowQueue: string = 'wes-workflow-queue';
    private eventQueue: string = 'wes-event-queue';
    private redis: Redis    

    constructor(connection: Redis) {
        this.redis = connection;        
    }

    public async queueForProcessing(id: string, queue: any): Promise<void> {
        this.redis.lpush(this.getQueueName(queue), id);
    }

    public dequeueForProcessing(queue: any): Promise<string> {
        return this.redis.rpop(this.getQueueName(queue));
    }

    private getQueueName(queue: any): string {
        let queueName = '';
        switch (queue) {
            case QueueType.Workflow:
                queueName = this.workflowQueue;
                break;
            case QueueType.Event:
                queueName = this.eventQueue;
                break;
        }
        return queueName;
    }    
}