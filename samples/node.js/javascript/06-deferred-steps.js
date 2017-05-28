const workflow_es = require("workflow-es");

class DeferredStep extends workflow_es.StepBody {
    run(context) {
        if (!context.persistenceData) {
            console.log("going to sleep...");
            return workflow_es.ExecutionResult.sleep(new Date(Date.now() + 5000), true);
        }
        else {
            console.log("waking up...");
            return workflow_es.ExecutionResult.next();
        }
    }
}

class DeferSample_Workflow {
    
    constructor() {
        this.id = "defer-sample";
        this.version = 1;
    }

    build(builder) {
        builder
            .startWith(DeferredStep)
            .thenRun(context => {
                console.log("done");
                return workflow_es.ExecutionResult.next();
            });
    }
}

async function main() {
    var config = workflow_es.configureWorkflow();
    //config.useLogger(new workflow_es.ConsoleLogger());
    //let mongoPersistence = new workflow_mongo.MongoDBPersistence("mongodb://127.0.0.1:27017/workflow-node");    
    //await mongoPersistence.connect;    
    //config.usePersistence(mongoPersistence);
    var host = config.getHost();
    host.registerWorkflow(new DeferSample_Workflow());
    await host.start();
    let id = await host.startWorkflow("defer-sample", 1);
    console.log("Started workflow: " + id);
}

main();
