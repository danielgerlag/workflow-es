# Typescript Guide

## Basic Concepts

### Steps

A workflow consists of a series of connected steps.  Each step produces an outcome value and subsequent steps are triggered by subscribing to a particular outcome of a preceeding step.
Steps are usually defined by inheriting from the StepBody abstract class and implementing the *run* method.  They can also be created inline while defining the workflow structure.

First we define some steps

```TypeScript
class HelloWorld extends StepBody {    
    public run(context: StepExecutionContext): Promise<ExecutionResult> {
        console.log("Hello World");
        return ExecutionResult.next();
    }
}
```

Then we define the workflow structure by composing a chain of steps.  The is done by implementing WorkflowBase<>.

```TypeScript
class HelloWorld_Workflow implements WorkflowBase<any> {    
    public id: string = "hello-world";
    public version: number = 1;

    public build(builder: WorkflowBuilder<any>) {        
        builder
            .startWith(HelloWorld)
            .then(GoodbyeWorld);
    }
}
```
The  id and version properties are used by the workflow host to identify a workflow definition.

You can also define your steps inline

```TypeScript
class HelloWorld_Workflow implements WorkflowBase<any> {    
    public id: string = "hello-world";
    public version: number = 1;

    public build(builder: WorkflowBuilder<any>) {        
        builder
            .startWith(HelloWorld)
            .thenRun((context) => {
                console.log("Goodbye world");                
                return ExecutionResult.next();
            });
    }
}
```
*The generic parameter on WorkflowBase<> is used to specify a strongly typed data class that will be persisted along with each instance of this workflow*

Each running workflow is persisted to the chosen persistence provider between each step, where it can be picked up at a later point in time to continue execution.  The outcome result of your step can instruct the workflow host to defer further execution of the workflow until a future point in time or in response to an external event.

The first time a particular step within the workflow is called, the persistenceData property on the context object is *null*.  The ExecutionResult produced by the *run* method can either cause the workflow to proceed to the next step by providing an outcome value, instruct the workflow to sleep for a defined period or simply not move the workflow forward.  If no outcome value is produced, then the step becomes re-entrant by setting persistenceData, so the workflow host will call this step again in the future buy will popluate the persistenceData with it's previous value.

For example, this step will initially run with *null* persistenceData and put the workflow to sleep for 1 hour, while setting the persistenceData to *true*.  1 hour later, the step will be called again but context.persistenceData will now contain the value from the previous iteration, and will now produce an outcome value of *null*, causing the workflow to move forward.

```TypeScript
class DeferredStep extends StepBody {    
    public run(context: StepExecutionContext): Promise<ExecutionResult> {
        if (!context.persistenceData) {
            console.log("going to sleep...");                
            return ExecutionResult.sleep(new Date(Date.now() + (1000 * 60 * 60)), true);
        }
        else {
            console.log("waking up...");
            return ExecutionResult.next();
        } 
    }
}
```

### Passing data between steps

Each step is intended to be a black-box, therefore they support inputs and outputs.  These inputs and outputs can be mapped to a data class that defines the custom data relevant to each workflow instance.

The following sample shows how to define inputs and outputs on a step, it then shows how define a workflow with a typed class for internal data and how to map the inputs and outputs to properties on the custom data class.

```TypeScript
//Our workflow step with inputs and outputs
class AddNumbers extends StepBody {    
    public number1: number;
    public number2: number;
    public result: number;

    public run(context: StepExecutionContext): Promise<ExecutionResult> {
        this.result = this.number1 + this.number2;
        return ExecutionResult.next();
    }
}

//Our class to define the internal data of our workflow
class MyDataClass {
    public value1: number;
    public value2: number;
    public value3: number;
}

//Our workflow definition with strongly typed internal data and mapped inputs & outputs
class DataSample_Workflow implements WorkflowBase<MyDataClass> {    
    public id: string = "data-sample";
    public version: number = 1;

    public build(builder: WorkflowBuilder<MyDataClass>) {        
        builder
            .startWith(AddNumbers)
                .input((step, data) => step.number1 = data.value1)
                .input((step, data) => step.number2 = data.value2)
                .output((step, data) => data.value3 = step.result)
            .then(LogMessage)
                .input((step, data) => step.message = "The answer is " + data.value3)
    }
}
```

### Events

A workflow can also wait for an external event before proceeding.  In the following example, the workflow will wait for an event called *"MyEvent"* with a key of *0*.  Once an external source has fired this event, the workflow will wake up and continue processing, passing the data generated by the event onto the next step.

```TypeScript
class EventSample_Workflow implements WorkflowBase<MyDataClass> {    
    public id: string = "event-sample";
    public version: number = 1;

    public build(builder: WorkflowBuilder<MyDataClass>) {        
        builder
            .startWith(LogMessage)
                .input((step, data) => step.message = "Waiting for event...")
            .waitFor("myEvent", data => "0")
                .output((step, data) => data.externalValue = step.eventData)
            .then(LogMessage)
                .input((step, data) => step.message = "The event data is " + data.externalValue)
    }
}
...
//External events are published via the host
//All workflows that have subscribed to MyEvent 0, will be passed "hello"
host.publishEvent("myEvent", "0", "hello");
```

### Host

The workflow host is the service responsible for executing workflows.  It does this by polling the persistence provider for workflow instances that are ready to run, executes them and then passes them back to the persistence provider to by stored for the next time they are run.  It is also responsible for publishing events to any workflows that may be waiting on one.

#### Usage

When your application starts, create a WorkflowHost service,  call *registerWorkflow*, so that the workflow host knows about all your workflows, and then call *start()* to fire up the event loop that executes workflows.  Use the *startWorkflow* method to initiate a new instance of a particular workflow.


```TypeScript
let config = configureWorkflow();
let host = config.getHost();
host.registerWorkflow(HelloWorld_Workflow);
await host.start();

let id = await host.startWorkflow("hello-world", 1);
console.log("Started workflow: " + id);
```


## Samples

### Node.JS

[Hello World](samples/node.js/typescript/01-hello-world.ts)

[Inline Steps](samples/node.js/typescript/02-hello-world.ts)

[Passing Data](samples/node.js/typescript/03-data.ts)

[Events](samples/node.js/typescript/04-events.ts)

[Multiple outcomes](samples/node.js/typescript/05-outcomes.ts)

[Deferred execution & re-entrant steps](samples/node.js/typescript/06-deferred-steps.ts)
