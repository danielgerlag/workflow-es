import { ExecutionError } from "./execution-error";

export class ExecutionPointer {

    public stepId : number;
    public active : boolean;
    public sleepUntil: number;
    public persistenceData: any;
    public startTime: Date;
    public endTime: Date;
    public eventName: string;
    public eventKey: string;
    public eventPublished: boolean;
    public eventData: any;
    public concurrentFork: number;
    public pathTerminal: boolean;
    public errors: Array<ExecutionError> = [];
    
}