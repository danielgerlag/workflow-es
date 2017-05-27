import { WorkflowHost, WorkflowBuilder, WorkflowBase, StepBody, StepExecutionContext, ExecutionResult, WorkflowInstance, configure, ConsoleLogger } from "workflow-es";
import { MongoDBPersistence } from "workflow-es-mongodb";

class HelloWorld extends StepBody {    
    public run(context: StepExecutionContext): Promise<ExecutionResult> {        
        console.log("Hello World");
        return ExecutionResult.next();
    }
}

class GoodbyeWorld extends StepBody {    
    public run(context: StepExecutionContext): Promise<ExecutionResult> {
        console.log("Goodbye World");
        return ExecutionResult.next();
    }
}

class HelloWorld_Workflow implements WorkflowBase<any> {    
    public id: string = "hello-world";
    public version: number = 1;

    public build(builder: WorkflowBuilder<any>) {        
        builder
            .startWith(HelloWorld)
            .then(GoodbyeWorld);
    }
}
async function main() {
    var config = configure();
    //config.useLogger(new ConsoleLogger());
    //let mongoPersistence = new MongoDBPersistence("mongodb://127.0.0.1:27017/workflow-node");    
    //await mongoPersistence.connect;    
    //config.usePersistence(mongoPersistence);
    var host = config.getHost();

    host.registerWorkflow(HelloWorld_Workflow);
    await host.start();
    let id = await host.startWorkflow("hello-world", 1);
    console.log("Started workflow: " + id);
}

main();