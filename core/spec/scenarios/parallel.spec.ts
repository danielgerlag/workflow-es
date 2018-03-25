import { WorkflowHost, WorkflowBuilder, WorkflowStatus, WorkflowBase, StepBody, StepExecutionContext, ExecutionResult, WorkflowInstance, configureWorkflow, ConsoleLogger } from "../../src";
import { MemoryPersistenceProvider } from "../../src/services/memory-persistence-provider";
import { spinWaitCallback, spinWait } from "../helpers/spin-wait";

 describe("parallel sequences", () => {

    let workflowScope = {
        step0Ticker: 0,
        step1Ticker: 0,
        step2Ticker: 0,
        step3Ticker: 0
    }

    class Step0 extends StepBody {
        public run(context: StepExecutionContext): Promise<ExecutionResult> {
            workflowScope.step0Ticker++;
            return ExecutionResult.next();
        }
    }

    class Step1 extends StepBody {
        public run(context: StepExecutionContext): Promise<ExecutionResult> {
            workflowScope.step1Ticker++;
            return ExecutionResult.next();
        }
    }

    class Step2 extends StepBody {
        public run(context: StepExecutionContext): Promise<ExecutionResult> {
            workflowScope.step2Ticker++;
            return ExecutionResult.next();
        }
    }

    class Step3 extends StepBody {
        public run(context: StepExecutionContext): Promise<ExecutionResult> {
            workflowScope.step3Ticker++;
            return ExecutionResult.next();
        }
    }

     class Parallel_Workflow implements WorkflowBase<any> {
         public id: string = "parallel-workflow";
         public version: number = 1;

         public build(builder: WorkflowBuilder<any>) {        
             builder
                 .startWith(Step0)
                 .parallel()
                    .do(branch1 => branch1
                        .startWith(Step1)
                        .waitFor("my-event", data => "0")
                    )
                    .do(branch2 => branch2
                        .startWith(Step2)                        
                    )
                .join()
                .then(Step3);
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
        host.registerWorkflow(Parallel_Workflow);
        await host.start();

        workflowId = await host.startWorkflow("parallel-workflow", 1, null);

        await spinWait(async () => {
            let subs = await persistence.getSubscriptions("my-event", "0", new Date());
            return (subs.length > 0);
        });

        expect(workflowScope.step0Ticker).toBe(1);
        expect(workflowScope.step1Ticker).toBe(1);
        expect(workflowScope.step2Ticker).toBe(1);
        expect(workflowScope.step3Ticker).toBe(0);

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

     it("should have taken correct execution path", function() {
        expect(workflowScope.step0Ticker).toBe(1);
        expect(workflowScope.step1Ticker).toBe(1);
        expect(workflowScope.step2Ticker).toBe(1);
        expect(workflowScope.step3Ticker).toBe(1);
    });

 });