const workflow_es = require("workflow-es");

class AddNumbers extends workflow_es.StepBody {
    run(context) {
        this.result = this.number1 + this.number2;
        return workflow_es.ExecutionResult.next();
    }
}
class LogMessage extends workflow_es.StepBody {
    run(context) {
        console.log(this.message);
        return workflow_es.ExecutionResult.next();
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

async function main() {
    var config = workflow_es.configure();
    //config.useLogger(new workflow_es.ConsoleLogger());
    var host = config.getHost();

    host.registerWorkflow(DataSample_Workflow);
    await host.start();
    let id = await host.startWorkflow("data-sample", 1, { value1: 2, value2: 7 });
    console.log("Started workflow: " + id);
}

main();