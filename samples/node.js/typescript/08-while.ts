import { WorkflowHost, WorkflowBuilder, WorkflowBase, StepBody, StepExecutionContext, ExecutionResult, WorkflowInstance, configureWorkflow, ConsoleLogger } from "workflow-es";
import { MongoDBPersistence } from "workflow-es-mongodb";

class SayHello extends StepBody {
    run(context: StepExecutionContext): Promise<ExecutionResult> {
        console.log("Hello");
        return ExecutionResult.next();
    }
}

class GetIncrement extends StepBody {
    
    public increment: number;
    
    run(context: StepExecutionContext): Promise<ExecutionResult> {
        this.increment = 1;
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
    public counter: number;
}


class While_Workflow implements WorkflowBase<MyDataClass> {    
    public id: string = "while-sample";
    public version: number = 1;

    public build(builder: WorkflowBuilder<MyDataClass>) {        
        builder
            .startWith(SayHello)
            .while((data) => data.counter < 3).do((then) => then
                .startWith(GetIncrement)
                    .output((step, data) => data.counter += step.increment)
                .then(DoSomething))
            .then(SayGoodbye);
    }
}

async function main() {
    var config = configureWorkflow();
    //config.useLogger(new ConsoleLogger());
    var host = config.getHost();

    host.registerWorkflow(While_Workflow);
    await host.start();
    let id = await host.startWorkflow("while-sample", 1, { counter: 0 });
    console.log("Started workflow: " + id);
}

main();