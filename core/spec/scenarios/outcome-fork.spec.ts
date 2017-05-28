 import { WorkflowHost, WorkflowBuilder, WorkflowStatus, WorkflowBase, StepBody, StepExecutionContext, ExecutionResult, WorkflowInstance, configureWorkflow, ConsoleLogger } from "../../src";
 import { MemoryPersistenceProvider } from "../../src/services/memory-persistence-provider";


 var outcomeForkScope = {
     taskATicker: 0,    
     taskBTicker: 0,
     taskCTicker: 0
 }

 describe("multiple outcomes", () => {

     class TaskA extends StepBody {    
         public run(context: StepExecutionContext): Promise<ExecutionResult> {
             outcomeForkScope.taskATicker++;
             return ExecutionResult.outcome(true);
         }
     }

     class TaskB extends StepBody {    
         public run(context: StepExecutionContext): Promise<ExecutionResult> {
             outcomeForkScope.taskBTicker++;
             return ExecutionResult.next();
         }
     }

     class TaskC extends StepBody {    
         public run(context: StepExecutionContext): Promise<ExecutionResult> {
             outcomeForkScope.taskCTicker++;
             return ExecutionResult.next();
         }
     }

     class Outcome_Workflow implements WorkflowBase<any> {    
         public id: string = "outcome-workflow";
         public version: number = 1;

         public build(builder: WorkflowBuilder<any>) {        
             var taskA = builder.startWith(TaskA);
            
             taskA.when(x => false)
                 .then(TaskB);
            
             taskA.when(x => true)
                 .then(TaskC);
         }
     }

     var workflowId = null;
     var instance = null;
     var persistence = new MemoryPersistenceProvider();
     var config = configureWorkflow();
     config.useLogger(new ConsoleLogger());
     config.usePersistence(persistence);
     var host = config.getHost();
     jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;

     beforeAll((done) => {
         host.registerWorkflow(Outcome_Workflow);
         host.start()
             .then(() => {                
                 host.startWorkflow("outcome-workflow", 1, null)
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

     it("should have executed task A once", function() {
         expect(outcomeForkScope.taskATicker).toBe(1);
     });

     it("should not have executed task B", function() {
         expect(outcomeForkScope.taskBTicker).toBe(0);
     });

     it("should have executed task C once", function() {
         expect(outcomeForkScope.taskCTicker).toBe(1);
     });



 });
