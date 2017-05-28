import { ExecutionResult, StepExecutionContext, ExecutionPointer } from "../models";
import { StepBody } from "../abstractions";

export abstract class ContainerStepBody extends StepBody {
    
    protected isBranchComplete(pointers: ExecutionPointer[], rootId: string): boolean {

        let root = pointers.find(x => x.id == rootId);

        if (!root.endTime)
            return false;

        let list = pointers.filter(x => x.predecessorId == rootId);

        let result = true;

        for(let item of list)
            result = result && this.isBranchComplete(pointers, item.id);

        return result;
    }

}