import { StepBody } from "../abstractions";
import { ExecutionPointer } from "./execution-pointer";
import { WorkflowStep } from "./workflow-step";

export class SagaContainer<T extends StepBody> extends WorkflowStep<T> {
    
    public resumeChildrenAfterCompensation(): boolean {
        return false;
    } 

    public revertChildrenAfterCompensation(): boolean {
        return true;
    }

    public primeForRetry(pointer: ExecutionPointer) {
        super.primeForRetry(pointer);
        pointer.persistenceData = null;
    }
    
}