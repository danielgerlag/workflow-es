import { Promise } from "es6-promise";
import { WorkflowHost, WorkflowBuilder, WorkflowBase, StepBody, StepExecutionContext, ExecutionResult, WorkflowInstance } from "@workflow/core";
import { MongoDBPersistence } from "@workflow/mongodb";


class LogMessage extends StepBody {
    
    public message: string;    

    public run(context: StepExecutionContext): Promise<ExecutionResult> {
        console.log(this.message);
        return ExecutionResult.resolveNext();
    }
}

class MyDataClass {    
    public externalValue: any;
}

class EventSample_Workflow implements WorkflowBase<MyDataClass> {    
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

var host = new WorkflowHost();
//host.usePersisence(new MongoDBPersistence("mongodb://127.0.0.1:27017/workflow-node"));
//host.useLogger(console);
host.registerWorkflow(new EventSample_Workflow());
host.start();

setTimeout(() => {
    host.startWorkflow("event-sample", 1)
        .then(id => console.log("Started workflow: " + id));
}, 1000);


setTimeout(() => {
    console.log("Publishing event...");
    host.publishEvent("myEvent", "0", "hi!")
        .then(() => console.log("Published event"));
}, 5000);
