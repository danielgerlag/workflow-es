import { ExecutionPointer } from "./execution-pointer";

export class WorkflowInstance {

    public id : string;
    public workflowDefinitionId : string;
    public version : number;
    public description : string;
    public nextExecution : number;
    public status : number;
    public data : any;
    public createTime : Date;
    public completeTime : Date;    
    public executionPointers : Array<ExecutionPointer> = [];

    constructor() {
        
    }    
}