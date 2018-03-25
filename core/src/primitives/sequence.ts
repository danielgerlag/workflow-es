import { ExecutionResult, StepExecutionContext, ContainerData } from "../models";
import { StepBody } from "../abstractions";
import { ContainerStepBody } from "./container-step-body";

export class Sequence extends ContainerStepBody {

    public run(context: StepExecutionContext): Promise<ExecutionResult> {

        if (!context.persistenceData) {
            let containerData = new ContainerData();
            containerData.childrenActive = true;
            return ExecutionResult.branch([null], containerData);
        }
        
        if ((context.persistenceData as ContainerData).childrenActive) {
            let complete: boolean = true;

            for(let childId of context.pointer.children)
                complete = complete && this.isBranchComplete(context.workflow.executionPointers, childId);

            if (complete)
                return ExecutionResult.next();
            else
                return ExecutionResult.persist(context.persistenceData);
        }
        
        return ExecutionResult.persist(context.persistenceData);
    }
}