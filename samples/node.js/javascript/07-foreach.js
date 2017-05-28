const workflow_es = require("workflow-es");
const workflow_mongo = require("workflow-es-mongodb");


class SayHello extends workflow_es.StepBody {
    run(context) {
        console.log("Hello");
        return workflow_es.ExecutionResult.next();
    }
}

class DisplayContext extends workflow_es.StepBody {
    run(context) {
        console.log(`Working on ${context.item}`);
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


class Foreach_Workflow {
    constructor() {
        this.id = "foreach-sample";
        this.version = 1;
    }
    build(builder) {
        builder
            .startWith(SayHello)
            .foreach((data) => ["one", "two", "three"]).do((then) => then
                .startWith(DisplayContext)
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

    host.registerWorkflow(Foreach_Workflow);
    await host.start();
    let id = await host.startWorkflow("foreach-sample", 1);
    console.log("Started workflow: " + id);
}

main();