 import { WorkflowHost, WorkflowBuilder, WorkflowStatus, WorkflowBase, StepBody, StepExecutionContext, ExecutionResult, WorkflowInstance, configure, ConsoleLogger } from "../../src";
 import { MemoryPersistenceProvider } from "../../src/services/memory-persistence-provider";

 describe("external events", () => {

     class Step1 extends StepBody {
         public run(context: StepExecutionContext): Promise<ExecutionResult> {            
             return ExecutionResult.resolveNext();
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

     var workflowId = null;
     var instance = null;
     var persistence = new MemoryPersistenceProvider();
     var config = configure();
     config.useLogger(new ConsoleLogger());
     config.usePersistence(persistence);
     var host = config.getHost();
     jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;

     beforeAll((done) => {
         host.registerWorkflow(Event_Workflow);
         host.start()
             .then(() => {
                 host.startWorkflow("event-workflow", 1, { value1: 2, value2: 3 })
                     .then(id => {                        
                         workflowId = id;
                         var counter1 = 0;
                        
                         var callback1 = () => {
                             persistence.getSubscriptions("my-event", "0", new Date())
                                 .then(subs => {
                                     if ((subs.length == 0) && (counter1 < 60))
                                         setTimeout(callback1, 500);
                                     else
                                         host.publishEvent("my-event", "0", "Pass", new Date());
                                     counter1++;
                                 })
                                 .catch(done.fail);
                         };                        
                        
                         var counter2 = 0;
                         var callback2 = () => {
                             persistence.getWorkflowInstance(workflowId)
                                 .then(result => {
                                     instance = result;
                                     if ((instance.status == WorkflowStatus.Runnable) && (counter2 < 60)) {
                                         counter2++;
                                         setTimeout(callback2, 500);
                                     }
                                     else {
                                         done();
                                     }
                                 })
                                 .catch(done.fail);                            
                         };
                         setTimeout(callback1, 500);
                         setTimeout(callback2, 1000);                        
                     });
             });         
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
