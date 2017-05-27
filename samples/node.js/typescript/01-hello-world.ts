import { WorkflowHost, WorkflowBuilder, WorkflowBase, StepBody, StepExecutionContext, ExecutionResult, WorkflowInstance, configure, ConsoleLogger } from "workflow-es";
import { MongoDBPersistence } from "workflow-es-mongodb";

class HelloWorld extends StepBody {    
    public run(context: StepExecutionContext): Promise<ExecutionResult> {        
        console.log("Hello World");
        return ExecutionResult.resolveNext();
    }
}

class GoodbyeWorld extends StepBody {    
    public run(context: StepExecutionContext): Promise<ExecutionResult> {
        console.log("Goodbye World");
        return ExecutionResult.resolveNext();
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

var config = configure();
//config.useLogger(new ConsoleLogger());
//config.usePersistence(new MongoDBPersistence("mongodb://127.0.0.1:27017/workflow-node"));
var host = config.getHost();

host.registerWorkflow(HelloWorld_Workflow);
host.start();

host.startWorkflow("hello-world", 1)
    .then(id => console.log("Started workflow: " + id));
