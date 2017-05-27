import { WorkflowHost, WorkflowBuilder, WorkflowBase, StepBody, StepExecutionContext, ExecutionResult, WorkflowInstance, configure, ConsoleLogger } from "workflow-es";
import { MongoDBPersistence } from "workflow-es-mongodb";


class LogMessage extends StepBody {
    
    public message: string;    

    public run(context: StepExecutionContext): Promise<ExecutionResult> {
        console.log(this.message);
        return ExecutionResult.next();
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
            .waitFor("myEvent", data => "0")
                .output((step, data) => data.externalValue = step.eventData)
            .then(LogMessage)
                .input((step, data) => step.message = "The event data is " + data.externalValue)
    }
}

async function main() {
    var config = configure();
    //config.useLogger(new ConsoleLogger());
    //let mongoPersistence = new MongoDBPersistence("mongodb://127.0.0.1:27017/workflow-node");    
    //await mongoPersistence.connect;    
    //config.usePersistence(mongoPersistence);
    var host = config.getHost();

    host.registerWorkflow(EventSample_Workflow);
    await host.start();

    var myData = new MyDataClass();    
    let id = await host.startWorkflow("event-sample", 1, myData)
    console.log("Started workflow: " + id);

    await new Promise(resolve => setTimeout(() => resolve(), 5000));

    console.log("Publishing event...");
    await host.publishEvent("myEvent", "0", "hi!", new Date());
    console.log("Published event");    
}

main();