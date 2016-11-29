import { Promise } from "es6-promise";
import { IQueueProvider } from "../abstractions";
import { EventPublication } from "../models";

export class SingleNodeQueueProvider implements IQueueProvider {

    private processQueue: Array<string> = [];
    private publishQueue: Array<EventPublication> = [];

    public queueForProcessing(workflowId: string): Promise<void> {
        var self = this;
        var deferred = new Promise<void>((resolve, reject) => {
            self.processQueue.push(workflowId);
            resolve();
        });
        return deferred;        
    }

    public dequeueForProcessing(): Promise<string> {
        var self = this;
        var deferred = new Promise<string>((resolve, reject) => {
            resolve(self.processQueue.shift());
        });
        return deferred;
    }

    public queueForPublish(publication: EventPublication): Promise<void> {
        var self = this;
        var deferred = new Promise<void>((resolve, reject) => {
            self.publishQueue.push(publication);
            resolve();
        });
        return deferred;
    }

    public dequeueForPublish(): Promise<EventPublication> {
        var self = this;
        var deferred = new Promise<EventPublication>((resolve, reject) => {
            resolve(self.publishQueue.shift());
        });
        return deferred;
    }

}