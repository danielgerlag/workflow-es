
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

async function main() {
    var config = workflow_es.configure();
    //config.useLogger(new workflow_es.ConsoleLogger());
    var host = config.getHost();

    host.registerWorkflow(OutcomeSample_Workflow);
    await host.start();
    let id = await host.startWorkflow("outcome-sample", 1, { myValue: 7 });
    console.log("Started workflow: " + id);
}

main();