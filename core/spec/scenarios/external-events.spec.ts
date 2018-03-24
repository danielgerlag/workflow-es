import { WorkflowHost, WorkflowBuilder, WorkflowStatus, WorkflowBase, StepBody, StepExecutionContext, ExecutionResult, WorkflowInstance, configureWorkflow, ConsoleLogger } from "../../src";
import { MemoryPersistenceProvider } from "../../src/services/memory-persistence-provider";
import { spinWaitCallback, spinWait } from "../helpers/spin-wait";

 describe("external events", () => {

     class Step1 extends StepBody {
         public run(context: StepExecutionContext): Promise<ExecutionResult> {            
             return ExecutionResult.next();
         }
     }    

     class MyDataClass {
         public myValue: string;
     }

     class Event_Workflow implements WorkflowBase<MyDataClass> {    
         public id: string = "event-workflow";
         public version: number = 1;

         public build(builder: WorkflowBuilder<MyDataClass>) {        
             builder
                 .startWith(Step1)
                 .waitFor("my-event", data => "0")
                     .output((step, data) => data.myValue = step.eventData);
         }
     }

     let workflowId = null;
     let instance = null;
     let persistence = new MemoryPersistenceProvider();
     let config = configureWorkflow();
     config.useLogger(new ConsoleLogger());
     config.usePersistence(persistence);
     let host = config.getHost();
     jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;

     beforeAll(async (done) => {
        host.registerWorkflow(Event_Workflow);
        await host.start();

        workflowId = await host.startWorkflow("event-workflow", 1, { value1: 2, value2: 3 });

        await spinWait(async () => {
            let subs = await persistence.getSubscriptions("my-event", "0", new Date());
            return (subs.length > 0);
        });

        await host.publishEvent("my-event", "0", "Pass", new Date());
                         
        spinWaitCallback(async () => {
            instance = await persistence.getWorkflowInstance(workflowId);
            return  (instance.status != WorkflowStatus.Runnable);
        }, done);
     });

     afterAll(() => {
         host.stop();        
     });
    
     it("should be marked as complete", function() {
         expect(instance.status).toBe(WorkflowStatus.Complete);
     });

     it("should have return value of 'Pass'", function() {
         expect(instance.data.myValue).toBe("Pass");
     });

 });
