import { WorkflowHost, WorkflowBuilder, WorkflowBase, StepBody, StepExecutionContext, ExecutionResult, WorkflowInstance, configureWorkflow, ConsoleLogger } from "workflow-es";
import { MongoDBPersistence } from "workflow-es-mongodb";

class SayHello extends StepBody {
    run(context: StepExecutionContext): Promise<ExecutionResult> {
        console.log("Hello");
        return ExecutionResult.next();
    }
}

class DisplayContext extends StepBody {
    run(context: StepExecutionContext): Promise<ExecutionResult> {
        console.log(`Working on ${context.item}`);
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


class MyDataClass {
    public value1: number;
    public value2: number;
    public value3: number;
}


class Foreach_Workflow implements WorkflowBase<MyDataClass> {    
    public id: string = "foreach-sample";
    public version: number = 1;

    public build(builder: WorkflowBuilder<MyDataClass>) {        
        builder
            .startWith(SayHello)
            .foreach((data) => ["one", "two", "three"]).do((then) => then
                .startWith(DisplayContext)
                .then(DoSomething))
            .then(SayGoodbye);
    }
}

async function main() {
    var config = configureWorkflow();
    //config.useLogger(new ConsoleLogger());
    var host = config.getHost();

    host.registerWorkflow(Foreach_Workflow);
    await host.start();
    let id = await host.startWorkflow("foreach-sample", 1, {});
    console.log("Started workflow: " + id);
}

main();