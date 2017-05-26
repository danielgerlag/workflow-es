import { ExecutionError } from "./execution-error";

export class ExecutionPointer {
    public id: string;
    public stepId : number;
    public active : boolean;
    public sleepUntil: number;
    public persistenceData: any;
    public startTime: Date;
    public endTime: Date;
    public eventName: string;
    public eventKey: any;
    public eventPublished: boolean;
    public eventData: any;

    public stepName: string;
    public retryCount: number;
    public children: string[] = [];
    public contextItem: any;
    public predecessorId: string;
    
}