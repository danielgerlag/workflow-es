import { injectable, inject } from "inversify";
import { QueueService, createQueueService, ErrorOrResult, ErrorOrResponse, ServiceResponse } from "azure-storage";
import { IQueueProvider, QueueType, TYPES, ILogger } from 'workflow-es';

@injectable()
export class AzureQueueProvider implements IQueueProvider {

    private queueService: QueueService;
    private workflowQueue: string = 'workflows';
    private eventQueue: string = 'events';

    constructor(connectionString: string) {
        this.queueService = createQueueService(connectionString);
        this.queueService.createQueueIfNotExists(this.workflowQueue, (error: Error, result: QueueService.QueueResult, response: ServiceResponse): void => {
            //TODO: log
        });
        this.queueService.createQueueIfNotExists(this.eventQueue, (error: Error, result: QueueService.QueueResult, response: ServiceResponse): void => {
            //TODO: log
        });
    }

    public queueForProcessing(id: string, queue: any): Promise<void> {
        var self = this;
        let queueName = this.getQueueName(queue);
        
        return new Promise<void>((resolve, reject) => {
            self.queueService.createMessage(queueName, id, (error: Error, result: QueueService.QueueMessageResult, response: ServiceResponse): void => {
                resolve();
            });
        });
    }

    public dequeueForProcessing(queue: any): Promise<string> {
        let queueName = this.getQueueName(queue);
        var self = this;

        return new Promise<string>((resolve, reject) => {
            self.queueService.getMessage(queueName, (error: Error, result: QueueService.QueueMessageResult, response: ServiceResponse): void => {
                
                if (!response.isSuccessful) {
                    reject(error.message);
                }
                
                if (!result) {
                    resolve(null);
                }
                else {
                    self.queueService.deleteMessage(queueName, result.messageId, result.popReceipt, (error: Error, response: ServiceResponse): void => {
                        //TODO: log
                    });
                    resolve(result.messageText);
                }
            });
        });
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