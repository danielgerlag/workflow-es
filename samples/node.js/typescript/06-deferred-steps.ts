import { WorkflowHost, WorkflowBuilder, WorkflowBase, StepBody, StepExecutionContext, ExecutionResult, WorkflowInstance } from "workflow-es";
import { MongoDBPersistence } from "workflow-es-mongodb";

class DeferredStep extends StepBody {    
    public run(context: StepExecutionContext): Promise<ExecutionResult> {
        if (!context.persistenceData) {
            console.log("going to sleep...");
            return ExecutionResult.sleep(new Date(Date.now() + 5000), true);
        }
        else {
            console.log("waking up...");
            return ExecutionResult.next();
        } 
    }
}

class DeferSample_Workflow implements WorkflowBase<any> {    
    public id: string = "defer-sample";
    public version: number = 1;

    public build(builder: WorkflowBuilder<any>) {        
        builder
            .startWith(DeferredStep)
            .thenRun(context => {
                console.log("done");
                return ExecutionResult.next();
            });
    }
}

async function main() {
    var config = configureWorkflow();
    //config.useLogger(new ConsoleLogger());
    var host = config.getHost();

    host.registerWorkflow(DeferSample_Workflow);
    await host.start();
    let id = await host.startWorkflow("defer-sample", 1, { myValue: 7 });
    console.log("Started workflow: " + id);
}

main();
