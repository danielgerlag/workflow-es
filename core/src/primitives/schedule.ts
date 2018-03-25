import { ExecutionResult, StepExecutionContext, SchedulePersistenceData } from "../models";
import { ContainerStepBody } from "./container-step-body";
import { StepBody } from "../abstractions";

export class Schedule extends ContainerStepBody {

    public interval: number;

    public run(context: StepExecutionContext): Promise<ExecutionResult> {
        
        let next = new Date(new Date().getTime() + this.interval);
        if (!context.persistenceData) {                        
            let data = new SchedulePersistenceData();
            data.elapsed = false;
            return ExecutionResult.sleep(next, data);        
        }
        
        if (!(context.persistenceData as SchedulePersistenceData).elapsed) {
            let data = new SchedulePersistenceData();
            data.elapsed = true;
            return ExecutionResult.branch([null], data);
        }
        
        let complete: boolean = true;

        for (let childId of context.pointer.children)
            complete = complete && this.isBranchComplete(context.workflow.executionPointers, childId);

        if (complete)
            return ExecutionResult.next();
        
        return ExecutionResult.persist(context.persistenceData);        
    }
}