import { WorkflowHost, WorkflowBuilder, WorkflowBase, StepBody, StepExecutionContext, ExecutionResult, WorkflowInstance } from "workflow-es";

export class HelloWorld extends StepBody {    
    public run(context: StepExecutionContext): Promise<ExecutionResult> {
        $("#output").append("Hello world<br>");        
        return ExecutionResult.resolveNext();
    }
}

export class GoodbyeWorld extends StepBody {    
    public run(context: StepExecutionContext): Promise<ExecutionResult> {
        $("#output").append("Goodbye world<br>");
        return ExecutionResult.resolveNext();
    }
}

export class HelloWorld_Workflow implements WorkflowBase<any> {    
    public id: string = "hello-world";
    public version: number = 1;

    public build(builder: WorkflowBuilder<any>) {        
        builder
            .startWith(HelloWorld)
            .then(GoodbyeWorld);
    }
}

