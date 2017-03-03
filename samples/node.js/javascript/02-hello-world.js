
const workflow_es = require("workflow-es");

class HelloWorld extends workflow_es.StepBody {
    run(context) {
        console.log("Hello World");
        return workflow_es.ExecutionResult.resolveNext();
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
            .thenRun((context) => {
                console.log("Goodbye world");
                return workflow_es.ExecutionResult.resolveNext();
            });
    }
}
var host = new workflow_es.WorkflowHost();
//host.usePersistence(new MongoDBPersistence("mongodb://127.0.0.1:27017/workflow-node"));
//host.useLogger(console);
host.registerWorkflow(new HelloWorld_Workflow());
host.start();
host.startWorkflow("hello-world", 1)
    .then(id => console.log("Started workflow: " + id));
