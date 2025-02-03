import { WorkflowHost, WorkflowBuilder, WorkflowStatus, WorkflowBase, StepBody, StepExecutionContext, ExecutionResult, WorkflowInstance, configureWorkflow, ConsoleLogger } from "workflow-es";
import { MySqlPersistence } from "../../src/mysql-provider";
import { getConnectionString, createTestSchema } from "../helpers/config";
import { spinWaitCallback } from "../helpers/spin-wait";

 describe("data io", () => {

     class AddNumbers extends StepBody {    
         public number1: number;
         public number2: number;
         public result: number;

         public run(context: StepExecutionContext): Promise<ExecutionResult> {
             this.result = this.number1 + this.number2;
             return ExecutionResult.next();
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

        host.registerWorkflow(Data_Workflow);
        await host.start();
        workflowId = await host.startWorkflow("data-workflow", 1, { value1: 2, value2: 3 });
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

     it("should have return value of 5", function() {
         expect(instance.data.value3).toBe(5);
     });

 });
