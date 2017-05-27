import { WorkflowHost, WorkflowBuilder, WorkflowBase, StepBody, StepExecutionContext, ExecutionResult, WorkflowInstance, configure, ConsoleLogger } from "workflow-es";
import { MongoDBPersistence } from "workflow-es-mongodb";


class AddNumbers extends StepBody {    
    public number1: number;
    public number2: number;
    public result: number;

    public run(context: StepExecutionContext): Promise<ExecutionResult> {
        this.result = this.number1 + this.number2;
        return ExecutionResult.resolveNext();
    }
}

class LogMessage extends StepBody {    
    public message: string;    

    public run(context: StepExecutionContext): Promise<ExecutionResult> {
        console.log(this.message);
        return ExecutionResult.resolveNext();
    }
}

class MyDataClass {
    public value1: number;
    public value2: number;
    public value3: number;
}


class DataSample_Workflow implements WorkflowBase<MyDataClass> {    
    public id: string = "data-sample";
    public version: number = 1;

    public build(builder: WorkflowBuilder<MyDataClass>) {        
        builder
            .startWith(AddNumbers)
                .input((step, data) => step.number1 = data.value1)
                .input((step, data) => step.number2 = data.value2)
                .output((step, data) => data.value3 = step.result)
            .then(LogMessage)
                .input((step, data) => step.message = "The answer is " + data.value3)
    }
}

var config = configure();
//config.useLogger(new ConsoleLogger());
//config.usePersistence(new MongoDBPersistence("mongodb://127.0.0.1:27017/workflow-node"));
var host = config.getHost();

host.registerWorkflow(DataSample_Workflow);
host.start();

host.startWorkflow("data-sample", 1, { value1: 2, value2: 7 })
    .then(id => console.log("Started workflow: " + id));


