import { WorkflowHost, WorkflowBuilder, WorkflowBase, StepBody, StepExecutionContext, ExecutionResult, WorkflowInstance } from "workflow-es";
import { MongoDBPersistence } from "workflow-es-mongodb";

class DeferredStep extends StepBody {    
    public run(context: StepExecutionContext): Promise<ExecutionResult> {
        if (!context.persistenceData) {
            console.log("going to sleep...");                
            return ExecutionResult.resolveSleep(new Date(Date.now() + 5000), true);
        }
        else {
            console.log("waking up...");
            return ExecutionResult.resolveNext();
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
                return ExecutionResult.resolveNext();
            });
    }
}

var host = new WorkflowHost();
//host.usePersistence(new MongoDBPersistence("mongodb://127.0.0.1:27017/workflow-node"));
//host.useLogger(console);
host.registerWorkflow(new DeferSample_Workflow());
host.start();

host.startWorkflow("defer-sample", 1)
    .then(id => console.log("Started workflow: " + id));
