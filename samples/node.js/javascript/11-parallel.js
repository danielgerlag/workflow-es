const workflow_es = require("workflow-es");
const workflow_mongo = require("workflow-es-mongodb");


class SayHello extends workflow_es.StepBody {
    run(context) {
        console.log("Hello");
        return workflow_es.ExecutionResult.next();
    }
}

class PrintMessage extends workflow_es.StepBody {
    run(context) {
        console.log(this.message);
        return workflow_es.ExecutionResult.next();
    }
}

class DoSomething extends workflow_es.StepBody {
    run(context) {
        console.log("Doing something...");
        return workflow_es.ExecutionResult.next();
    }
}

class SayGoodbye extends workflow_es.StepBody {
    run(context) {
        console.log("Bye");
        return workflow_es.ExecutionResult.next();
    }
}


class Parallel_Workflow {
    constructor() {
        this.id = "parallel-sample";
        this.version = 1;
    }
    build(builder) {
        builder
        .startWith(SayHello)
        .parallel()
            .do(branch1 => branch1
                .startWith(PrintMessage)
                    .input((step, data) => step.message = "Running in branch 1")
                .delay(data => 5000)
                .then(DoSomething)
            )
            .do(branch2 => branch2
                .startWith(PrintMessage)
                    .input((step, data) => step.message = "Running in branch 2")
            )
            .do(branch3 => branch3
                .startWith(PrintMessage)
                    .input((step, data) => step.message = "Running in branch 3")
            )
        .join()
        .then(SayGoodbye);
    }
}

async function main() {
    var config = workflow_es.configureWorkflow();
    var host = config.getHost();

    host.registerWorkflow(Parallel_Workflow);
    await host.start();
    let id = await host.startWorkflow("parallel-sample", 1);
    console.log("Started workflow: " + id);
}

main();