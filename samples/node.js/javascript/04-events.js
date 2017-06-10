const workflow_es = require("workflow-es");
const workflow_mongo = require("workflow-es-mongodb");
const workflow_azure = require("workflow-es-azure");

class LogMessage extends workflow_es.StepBody {
    run(context) {
        console.log(this.message);
        return workflow_es.ExecutionResult.next();
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
async function main() {
    var config = workflow_es.configureWorkflow();
    config.useLogger(new workflow_es.ConsoleLogger());
    //let mongoPersistence = new workflow_mongo.MongoDBPersistence("mongodb://127.0.0.1:27017/workflow-node");
    //await mongoPersistence.connect;
    //config.usePersistence(mongoPersistence);
    //config.useLockManager(new workflow_azure.AzureLockManager('UseDevelopmentStorage=true'));    
    //config.useQueueManager(new workflow_azure.AzureQueueProvider('UseDevelopmentStorage=true'));

    var host = config.getHost();

    host.registerWorkflow(EventSample_Workflow);
    await host.start();

    var myData = new MyDataClass();
    myData.myId = "0";
    let id = await host.startWorkflow("event-sample", 1, myData)
    console.log("Started workflow: " + id);

    await new Promise(resolve => setTimeout(() => resolve(), 5000));

    console.log("Publishing event...");
    await host.publishEvent("myEvent", "0", "hi!", new Date());
    console.log("Published event");    
}

main();
