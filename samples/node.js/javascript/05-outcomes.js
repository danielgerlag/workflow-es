
const workflow_es = require("workflow-es");
const steps = require("./05-outcomes.steps");

class MyDataClass {
}
class OutcomeSample_Workflow {
    constructor() {
        this.id = "outcome-sample";
        this.version = 1;
    }
    build(builder) {
        builder
            .startWith(steps.SelectOutcome)
                .name("Determine Future")
                .input((step, data) => step.myValue = data.myValue)
                .when(0)
                    .then(steps.TaskA)
                    .then(steps.TaskB)
                .end("Determine Future")
                .when(1)
                    .then(steps.TaskC)
                    .then(steps.TaskD)
                .end("Determine Future");
    }
}
var host = new workflow_es.WorkflowHost();
//host.usePersistence(new MongoDBPersistence("mongodb://127.0.0.1:27017/workflow-node"));
//host.useLogger(console);
host.registerWorkflow(new OutcomeSample_Workflow());
host.start();
host.startWorkflow("outcome-sample", 1, { myValue: 7 })
    .then(id => console.log("Started workflow: " + id));
