import { WorkflowHost, WorkflowBuilder, WorkflowBase, StepBody, StepExecutionContext, ExecutionResult, WorkflowInstance } from "workflow-es";
import { MongoDBPersistence } from "workflow-es-mongodb";


export class SelectOutcome extends StepBody {    
    public myValue: number;    

    public run(context: StepExecutionContext): Promise<ExecutionResult> {
        var result = 0;
        if (this.myValue > 5)
            result = 1;

        return ExecutionResult.outcome(result);
    }
}

export class TaskA extends StepBody {
    public run(context: StepExecutionContext): Promise<ExecutionResult> {
        console.log("Doing Task A");
        return ExecutionResult.next();
    }
}

export class TaskB extends StepBody {
    public run(context: StepExecutionContext): Promise<ExecutionResult> {
        console.log("Doing Task B");
        return ExecutionResult.next();
    }
}

export class TaskC extends StepBody {
    public run(context: StepExecutionContext): Promise<ExecutionResult> {
        console.log("Doing Task C");
        return ExecutionResult.next();
    }
}

export class TaskD extends StepBody {
    public run(context: StepExecutionContext): Promise<ExecutionResult> {
        console.log("Doing Task D");
        return ExecutionResult.next();
    }
}

