const workflow_es = require("workflow-es");

class AddNumbers extends workflow_es.StepBody {
    run(context) {
        this.result = this.number1 + this.number2;
        return workflow_es.ExecutionResult.resolveNext();
    }
}
class LogMessage extends workflow_es.StepBody {
    run(context) {
        console.log(this.message);
        return workflow_es.ExecutionResult.resolveNext();
    }
}

class DataSample_Workflow {
    constructor() {
        this.id = "data-sample";
        this.version = 1;
    }
    build(builder) {
        builder
            .startWith(AddNumbers)
                .input((step, data) => step.number1 = data.value1)
                .input((step, data) => step.number2 = data.value2)
                .output((step, data) => data.value3 = step.result)
            .then(LogMessage)
                .input((step, data) => step.message = "The answer is " + data.value3);
    }
}

var container = workflow_es.configure();
var host = container.get(workflow_es.TYPES.IWorkflowHost);

//var host = new workflow_es.WorkflowHost();
//host.usePersistence(new MongoDBPersistence("mongodb://127.0.0.1:27017/workflow-node"));
//host.useLogger(console);
host.registerWorkflow(new DataSample_Workflow());
host.start();
host.startWorkflow("data-sample", 1, { value1: 2, value2: 7 })
    .then(id => console.log("Started workflow: " + id));
