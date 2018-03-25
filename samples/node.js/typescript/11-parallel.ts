import { WorkflowHost, WorkflowBuilder, WorkflowBase, StepBody, StepExecutionContext, ExecutionResult, WorkflowInstance, configureWorkflow, ConsoleLogger } from "workflow-es";
import { MongoDBPersistence } from "workflow-es-mongodb";

class SayHello extends StepBody {
    run(context: StepExecutionContext): Promise<ExecutionResult> {
        console.log("Hello");
        return ExecutionResult.next();
    }
}

class PrintMessage extends StepBody {
    
    public message: string;    

    public run(context: StepExecutionContext): Promise<ExecutionResult> {
        console.log(this.message);
        return ExecutionResult.next();
    }
}
class DoSomething extends StepBody {
    run(context: StepExecutionContext): Promise<ExecutionResult> {
        console.log("Doing something...");
        return ExecutionResult.next();
    }
}

class SayGoodbye extends StepBody {
    run(context: StepExecutionContext): Promise<ExecutionResult> {
        console.log("Bye");
        return ExecutionResult.next();
    }
}

class Parallel_Workflow implements WorkflowBase<any> {    
    public id: string = "parallel-sample";
    public version: number = 1;

    public build(builder: WorkflowBuilder<any>) {        
        builder
            .startWith(SayHello)
            .parallel()
                .do(branch1 => branch1
                    .startWith(PrintMessage)
                        .input((step, data) => step.message = "Running in branch 1")
                    .delay(data => 5000)
                    .then(DoSomething)
                )
                .do(branch2 => branch2
                    .startWith(PrintMessage)
                        .input((step, data) => step.message = "Running in branch 2")
                )
                .do(branch3 => branch3
                    .startWith(PrintMessage)
                        .input((step, data) => step.message = "Running in branch 3")
                )
            .join()
            .then(SayGoodbye);
    }
}

async function main() {
    var config = configureWorkflow();
    //config.useLogger(new ConsoleLogger());
    var host = config.getHost();

    host.registerWorkflow(Parallel_Workflow);
    await host.start();
    let id = await host.startWorkflow("parallel-sample", 1, null);
    console.log("Started workflow: " + id);
}

main();