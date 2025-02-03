import { configureWorkflow, WorkflowHost, WorkflowBuilder, WorkflowStatus, WorkflowBase, StepBody, StepExecutionContext, ExecutionResult, WorkflowInstance, ConsoleLogger } from "workflow-es";
import { MySqlPersistence } from "../../src/mysql-provider";
import { getConnectionString, createTestSchema } from "../helpers/config";
import { spinWaitCallback } from "../helpers/spin-wait";

let basicWorkflowScope = {
     step1Ticker: 0,    
     step2Ticker: 0
 }

 describe("basic workflow", async () => {

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
     let persistence = null;
     let config = null;
     let host = null;
     jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;

     async function initializeWorkflow() {
        persistence = new MySqlPersistence(getConnectionString());
        config = configureWorkflow();
        config.useLogger(new ConsoleLogger());
        config.usePersistence(persistence);
        host = config.getHost();
     }

     beforeAll(async (done) => {
        await createTestSchema();
         await initializeWorkflow();
         
        host.registerWorkflow(Basic_Workflow);
        await host.start();
        workflowId = await host.startWorkflow("basic-workflow", 1, null);
        spinWaitCallback(async () => {
            instance = await persistence.getWorkflowInstance(workflowId);
            return  (instance.status != WorkflowStatus.Runnable);
        }, done);
     });

     afterAll(() => {
        //  host.stop();        
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
