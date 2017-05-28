const workflow_es = require("workflow-es");
const workflow_mongo = require("workflow-es-mongodb");


class HelloWorld extends workflow_es.StepBody {
    run(context) {
        console.log("Hello World");
        return workflow_es.ExecutionResult.next();
    }
}
class GoodbyeWorld extends workflow_es.StepBody {
    run(context) {
        console.log("Goodbye World");
        return workflow_es.ExecutionResult.next();
    }
}
class HelloWorld_Workflow {
    constructor() {
        this.id = "hello-world";
        this.version = 1;
    }
    build(builder) {
        builder
            .startWith(HelloWorld)
            .then(GoodbyeWorld);
    }
}

async function main() {
    var config = workflow_es.configureWorkflow();
    //config.useLogger(new workflow_es.ConsoleLogger());
    //let mongoPersistence = new workflow_mongo.MongoDBPersistence("mongodb://127.0.0.1:27017/workflow-node");    
    //await mongoPersistence.connect;    
    //config.usePersistence(mongoPersistence);
    var host = config.getHost();

    host.registerWorkflow(HelloWorld_Workflow);
    await host.start();
    let id = await host.startWorkflow("hello-world", 1);
    console.log("Started workflow: " + id);
}

main();


