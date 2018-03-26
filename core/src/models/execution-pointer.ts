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
    public outcome: any;
    public stepName: string;
    public retryCount: number;
    public children: string[] = [];
    public contextItem: any;
    public predecessorId: string;
    public scope: string[] = [];
    public status: number;    
}

export var PointerStatus = {
    Legacy: 0,
    Pending: 1,
    Running: 2,
    Complete: 3,
    Sleeping: 4,
    WaitingForEvent: 5,
    Failed: 6,
    Compensated: 7
}