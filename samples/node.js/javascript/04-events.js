const workflow_es = require("workflow-es");

class LogMessage extends workflow_es.StepBody {
    run(context) {
        console.log(this.message);
        return workflow_es.ExecutionResult.resolveNext();
    }
}

class MyDataClass {
    constructor() {
        this.myId = null;
    }    
}

class EventSample_Workflow {
    constructor() {
        this.id = "event-sample";
        this.version = 1;
    }
    build(builder) {
        builder
            .startWith(LogMessage)
                .input((step, data) => step.message = "Waiting for event...")
                .waitFor("myEvent", data => data.myId)
                .output((step, data) => data.externalValue = step.eventData)
            .then(LogMessage)
                .input((step, data) => step.message = "The event data is " + data.externalValue);
    }
}
var host = new workflow_es.WorkflowHost();
//host.usePersistence(new MongoDBPersistence("mongodb://127.0.0.1:27017/workflow-node"));
host.useLogger(console);
host.registerWorkflow(new EventSample_Workflow());
host.start();
setTimeout(() => {
    var myData = new MyDataClass();
    myData.myId = "0";
    
    host.startWorkflow("event-sample", 1,  myData )
        .then(id => console.log("Started workflow: " + id));
}, 1000);
setTimeout(() => {
    console.log("Publishing event...");
    host.publishEvent("myEvent", "0", "hi!")
        .then(() => console.log("Published event"));
}, 5000);
