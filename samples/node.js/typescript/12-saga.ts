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

class UndoSomething extends StepBody {
    run(context: StepExecutionContext): Promise<ExecutionResult> {
        console.log("Undoing something...");
        return ExecutionResult.next();
    }
}

class DoSomethingBad extends StepBody {
    run(context: StepExecutionContext): Promise<ExecutionResult> {
        console.log("Doing something bad...");
        throw "Explode";
    }
}

class SayGoodbye extends StepBody {
    run(context: StepExecutionContext): Promise<ExecutionResult> {
        console.log("Bye");
        return ExecutionResult.next();
    }
}

class Saga_Workflow implements WorkflowBase<any> {    
    public id: string = "saga-sample";
    public version: number = 1;

    public build(builder: WorkflowBuilder<any>) {        
        builder
            .startWith(SayHello)
            .saga(saga => saga
                .startWith(DoSomething)
                .then(DoSomethingBad)
            )
            .compensateWith(UndoSomething)
            .then(SayGoodbye);
    }
}

async function main() {
    var config = configureWorkflow();
    //config.useLogger(new ConsoleLogger());
    var host = config.getHost();

    host.registerWorkflow(Saga_Workflow);
    await host.start();
    let id = await host.startWorkflow("saga-sample", 1, null);
    console.log("Started workflow: " + id);
}

main();