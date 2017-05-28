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


class If_Workflow {
    constructor() {
        this.id = "if-sample";
        this.version = 1;
    }
    build(builder) {
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
    var config = workflow_es.configureWorkflow();
    //config.useLogger(new workflow_es.ConsoleLogger());
    //let mongoPersistence = new workflow_mongo.MongoDBPersistence("mongodb://127.0.0.1:27017/workflow-node");    
    //await mongoPersistence.connect;    
    //config.usePersistence(mongoPersistence);
    var host = config.getHost();

    host.registerWorkflow(If_Workflow);
    await host.start();
    let id = await host.startWorkflow("if-sample", 1, { value: 5 });
    console.log("Started workflow: " + id);
}

main();