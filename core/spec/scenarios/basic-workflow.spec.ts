import { configureWorkflow, WorkflowHost, WorkflowBuilder, WorkflowStatus, WorkflowBase, StepBody, StepExecutionContext, ExecutionResult, WorkflowInstance, ConsoleLogger } from "../../src";
import { MemoryPersistenceProvider } from "../../src/services/memory-persistence-provider";

let basicWorkflowScope = {
     step1Ticker: 0,    
     step2Ticker: 0
 }

 describe("basic workflow", () => {

     class Step1 extends StepBody {    
         public run(context: StepExecutionContext): Promise<ExecutionResult> {
             basicWorkflowScope.step1Ticker++;
             return ExecutionResult.next();
         }
     }

     class Step2 extends StepBody {    
         public run(context: StepExecutionContext): Promise<ExecutionResult> {
             basicWorkflowScope.step2Ticker++;
             return ExecutionResult.next();
         }
     }

     class Basic_Workflow implements WorkflowBase<any> {    
         public id: string = "basic-workflow";
         public version: number = 1;

         public build(builder: WorkflowBuilder<any>) {        
             builder
                 .startWith(Step1)
                 .then(Step2);
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

     beforeAll((done) => {
         host.registerWorkflow(Basic_Workflow);
         host.start()
             .then(() => {                
                 host.startWorkflow("basic-workflow", 1, null)
                     .then(id => {                        
                         workflowId = id;
                         let counter = 0;
                         let callback = () => {
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

     it("should have an id", function() {            
         expect(workflowId).toBeDefined();
     });

     it("should be marked as complete", function() {
         expect(instance.status).toBe(WorkflowStatus.Complete);
     });

     it("should have executed step 1 once", function() {
         expect(basicWorkflowScope.step1Ticker).toBe(1);
     });

     it("should have executed step 2 once", function() {
         expect(basicWorkflowScope.step2Ticker).toBe(1);
     });    


 });
