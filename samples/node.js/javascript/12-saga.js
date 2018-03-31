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

class UndoSomething extends workflow_es.StepBody {
    run(context) {
        console.log("Undoing something...");
        return workflow_es.ExecutionResult.next();
    }
}

class DoSomethingBad extends workflow_es.StepBody {
    run(context) {
        console.log("Doing something bad...");
        throw "explode";
    }
}


class SayGoodbye extends workflow_es.StepBody {
    run(context) {
        console.log("Bye");
        return workflow_es.ExecutionResult.next();
    }
}


class Saga_Workflow {
    constructor() {
        this.id = "saga-sample";
        this.version = 1;
    }
    build(builder) {
        builder
        .startWith(SayHello)
        .saga(saga => saga
            .startWith(DoSomething)
            .then(DoSomethingBad)
        )
        .compensateWith(UndoSomething)
        .then(SayGoodbye);
    }
}

async function main() {
    var config = workflow_es.configureWorkflow();
    //let mongoPersistence = new workflow_mongo.MongoDBPersistence("mongodb://127.0.0.1:27017/workflow-node");    
    //await mongoPersistence.connect;    
    //config.usePersistence(mongoPersistence);
    var host = config.getHost();

    host.registerWorkflow(Saga_Workflow);
    await host.start();
    let id = await host.startWorkflow("saga-sample", 1);
    console.log("Started workflow: " + id);
}

main();