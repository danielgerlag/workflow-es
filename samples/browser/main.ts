import { WorkflowHost } from "workflow-es";
import { HelloWorld_Workflow } from "./01-hello-world";
import { DataSample_Workflow } from "./02-data";
import { EventSample_Workflow } from "./03-events";

var host = new WorkflowHost();
//host.usePersistence(new MongoDBPersistence("mongodb://127.0.0.1:27017/workflow-node"));
host.useLogger(console);
host.registerWorkflow(new HelloWorld_Workflow());
host.registerWorkflow(new DataSample_Workflow());
host.registerWorkflow(new EventSample_Workflow());
host.start();

$(document).ready(function(){            
    
    $("#helloworld").click(function(){        
        host.startWorkflow("hello-world", 1);
    });

    $("#data").click(function(){        
        host.startWorkflow("data-sample", 1, { value1: 2, value2: 7 });
    });

    $("#event").click(function(){        
        host.startWorkflow("event-sample", 1);
    });

    $("#publish").click(function(){        
        host.publishEvent("myEvent", "0", "hello");
    });

});

