const workflow_es = require("workflow-es");

class HelloWorld extends workflow_es.StepBody {
    run(context) {
        console.log("Hello World");
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
            .thenRun((context) => {
                console.log("Goodbye world");
                return workflow_es.ExecutionResult.next();
            });
    }
}

async function main() {
    var config = workflow_es.configureWorkflow();
    //config.useLogger(new workflow_es.ConsoleLogger());
    var host = config.getHost();

    host.registerWorkflow(HelloWorld_Workflow);
    await host.start();
    let id = await host.startWorkflow("hello-world", 1);
    console.log("Started workflow: " + id);
}

main();