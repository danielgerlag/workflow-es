import { WorkflowHost, WorkflowBuilder, WorkflowBase, StepBody, StepExecutionContext, ExecutionResult, WorkflowInstance, configureWorkflow, ConsoleLogger } from "workflow-es";
import { MongoDBPersistence } from "workflow-es-mongodb";
import { SelectOutcome, TaskA, TaskB, TaskC, TaskD } from "./05-outcomes.steps";

class MyDataClass {
    public myValue: number;
}


class OutcomeSample_Workflow implements WorkflowBase<MyDataClass> {    
    public id: string = "outcome-sample";
    public version: number = 1;

    public build(builder: WorkflowBuilder<MyDataClass>) {        
        builder
            .startWith(SelectOutcome)
                .name("Determine Future")
                .input((step, data) => step.myValue = data.myValue)
                .when((data) => 0)
                    .then(TaskA)
                    .then(TaskB)
                .end<SelectOutcome>("Determine Future")
                .when((data) => 1)
                    .then(TaskC)
                    .then(TaskD)
                .end<SelectOutcome>("Determine Future");
    }
}

async function main() {
    var config = configureWorkflow();
    //config.useLogger(new ConsoleLogger());
    var host = config.getHost();

    host.registerWorkflow(OutcomeSample_Workflow);
    await host.start();
    let id = await host.startWorkflow("outcome-sample", 1, { myValue: 7 });
    console.log("Started workflow: " + id);
}

main();
