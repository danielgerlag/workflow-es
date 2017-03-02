import { WorkflowHost, WorkflowBuilder, WorkflowBase, StepBody, StepExecutionContext, ExecutionResult, WorkflowInstance } from "workflow-es";

export class LogMessage extends StepBody {    
    public message: string;    

    public run(context: StepExecutionContext): Promise<ExecutionResult> {
        $("#output").append(this.message + "<br>");
        return ExecutionResult.resolveNext();
    }
}

export class MyDataClass {    
    public externalValue: any;
}

export class EventSample_Workflow implements WorkflowBase<MyDataClass> {    
    public id: string = "event-sample";
    public version: number = 1;

    public build(builder: WorkflowBuilder<MyDataClass>) {        
        builder
            .startWith(LogMessage)
                .input((step, data) => step.message = "Waiting for event...")
            .waitFor("myEvent", "0")
                .output((step, data) => data.externalValue = step.eventData)
            .then(LogMessage)
                .input((step, data) => step.message = "The event data is " + data.externalValue)
    }
}