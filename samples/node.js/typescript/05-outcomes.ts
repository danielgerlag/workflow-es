import { WorkflowHost, WorkflowBuilder, WorkflowBase, StepBody, StepExecutionContext, ExecutionResult, WorkflowInstance, configure, ConsoleLogger } from "workflow-es";
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
                .when(0)
                    .then(TaskA)
                    .then(TaskB)
                .end<SelectOutcome>("Determine Future")
                .when(1)
                    .then(TaskC)
                    .then(TaskD)
                .end<SelectOutcome>("Determine Future");
    }
}

var config = configure();
//config.useLogger(new ConsoleLogger());
//config.usePersistence(new MongoDBPersistence("mongodb://127.0.0.1:27017/workflow-node"));
var host = config.getHost();

host.registerWorkflow(OutcomeSample_Workflow);
host.start();

host.startWorkflow("outcome-sample", 1, { myValue: 7 })
    .then(id => console.log("Started workflow: " + id));



