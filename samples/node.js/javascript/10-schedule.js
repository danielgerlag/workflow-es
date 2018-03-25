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


class Schedule_Workflow {
    constructor() {
        this.id = "schedule-sample";
        this.version = 1;
    }
    build(builder) {
        builder
            .startWith(SayHello)
            .schedule((data) => 20000).do((then) => then
                .startWith(PrintMessage)
                    .input((step, data) => step.message = "firing")
                .then(DoSomething))
            .then(SayGoodbye);
    }
}

async function main() {
    var config = workflow_es.configureWorkflow();
    var host = config.getHost();

    host.registerWorkflow(Schedule_Workflow);
    await host.start();
    let id = await host.startWorkflow("schedule-sample", 1);
    console.log("Started workflow: " + id);
}

main();