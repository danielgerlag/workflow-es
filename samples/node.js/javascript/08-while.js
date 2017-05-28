const workflow_es = require("workflow-es");
const workflow_mongo = require("workflow-es-mongodb");


class SayHello extends workflow_es.StepBody {
    run(context) {
        console.log("Hello");
        return workflow_es.ExecutionResult.next();
    }
}

class GetIncrement extends workflow_es.StepBody {
    run(context) {
        this.increment = 1;
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


class While_Workflow {
    constructor() {
        this.id = "while-sample";
        this.version = 1;
    }
    build(builder) {
        builder
            .startWith(SayHello)
            .while((data) => data.counter < 3).do((then) => then
                .startWith(GetIncrement)
                    .output((step, data) => data.counter += step.increment)
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

    host.registerWorkflow(While_Workflow);
    await host.start();
    let id = await host.startWorkflow("while-sample", 1, { counter: 0 });
    console.log("Started workflow: " + id);
}

main();


