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


class MyDataClass {
    public value: number;
}


class If_Workflow implements WorkflowBase<MyDataClass> {    
    public id: string = "if-sample";
    public version: number = 1;

    public build(builder: WorkflowBuilder<MyDataClass>) {        
        builder
            .startWith(SayHello)
            .if((data) => data.value > 3).do((then) => then
                .startWith(PrintMessage)
                    .input((step, data) => step.message = "Value is greater than 3")
                .then(DoSomething))
            .if((data) => data.value > 6).do((then) => then
                .startWith(PrintMessage)
                    .input((step, data) => step.message = "Value is greater than 6")
                .then(DoSomething))
            .if((data) => data.value == 5).do((then) => then
                .startWith(PrintMessage)
                    .input((step, data) => step.message = "Value is 5")
                .then(DoSomething))
            .then(SayGoodbye);
    }
}

async function main() {
    var config = configureWorkflow();
    //config.useLogger(new ConsoleLogger());
    var host = config.getHost();

    host.registerWorkflow(If_Workflow);
    await host.start();
    let id = await host.startWorkflow("if-sample", 1, { value: 5 });
    console.log("Started workflow: " + id);
}

main();