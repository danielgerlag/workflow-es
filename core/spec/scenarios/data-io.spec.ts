 import { WorkflowHost, WorkflowBuilder, WorkflowStatus, WorkflowBase, StepBody, StepExecutionContext, ExecutionResult, WorkflowInstance, configure, ConsoleLogger } from "../../src";
 import { MemoryPersistenceProvider } from "../../src/services/memory-persistence-provider";

 describe("data io", () => {

     class AddNumbers extends StepBody {    
         public number1: number;
         public number2: number;
         public result: number;

         public run(context: StepExecutionContext): Promise<ExecutionResult> {
             this.result = this.number1 + this.number2;
             return ExecutionResult.resolveNext();
         }
     }    

     class MyDataClass {
         public value1: number;
         public value2: number;
         public value3: number;
     }

     class Data_Workflow implements WorkflowBase<MyDataClass> {    
         public id: string = "data-workflow";
         public version: number = 1;

         public build(builder: WorkflowBuilder<MyDataClass>) {        
             builder
             .startWith(AddNumbers)
                 .input((step, data) => step.number1 = data.value1)
                 .input((step, data) => step.number2 = data.value2)
                 .output((step, data) => data.value3 = step.result)
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
         host.registerWorkflow(Data_Workflow);
         host.start()
             .then(() => {
                 host.startWorkflow("data-workflow", 1, { value1: 2, value2: 3 })
                     .then(id => {                        
                         workflowId = id;
                         var counter = 0;
                         var callback = () => {
                             persistence.getWorkflowInstance(workflowId)
                                 .then(result => {
                                     instance = result;
                                     if ((instance.status == WorkflowStatus.Runnable) && (counter < 60)) {
                                         counter++;
                                         setTimeout(callback, 500);
                                     }
                                     else {
                                         done();
                                     }
                                 })
                                 .catch(done.fail);                            
                         };
                         setTimeout(callback, 500);                        
                     });
             });         
     });

     afterAll(() => {
         host.stop();        
     });
    
     it("should be marked as complete", function() {
         expect(instance.status).toBe(WorkflowStatus.Complete);
     });

     it("should have return value of 5", function() {
         expect(instance.data.value3).toBe(5);
     });

 });
