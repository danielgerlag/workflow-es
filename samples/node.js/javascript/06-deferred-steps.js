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

var host = new workflow_es.WorkflowHost();
//host.usePersistence(new MongoDBPersistence("mongodb://127.0.0.1:27017/workflow-node"));
//host.useLogger(console);
host.registerWorkflow(new DeferSample_Workflow());
host.start();
host.startWorkflow("defer-sample", 1)
    .then(id => console.log("Started workflow: " + id));
