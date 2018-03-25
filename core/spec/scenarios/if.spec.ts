import { WorkflowHost, WorkflowBuilder, WorkflowStatus, WorkflowBase, StepBody, StepExecutionContext, ExecutionResult, WorkflowInstance, configureWorkflow, ConsoleLogger } from "../../src";
import { MemoryPersistenceProvider } from "../../src/services/memory-persistence-provider";
import { spinWaitCallback } from "../helpers/spin-wait";

 describe("if scenario", () => {

    let workflowScope = {
        step1Ticker: 0,    
        step2Ticker: 0,
        step3Ticker: 0,
        step4Ticker: 0
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

    class Step4 extends StepBody {
        public run(context: StepExecutionContext): Promise<ExecutionResult> {
            workflowScope.step4Ticker++;
            return ExecutionResult.next();
        }
    }

    class MyDataClass {
        public value: number;
    }

    class Data_Workflow implements WorkflowBase<MyDataClass> {    
        public id: string = "if-workflow";
        public version: number = 1;

        public build(builder: WorkflowBuilder<MyDataClass>) {        
            builder
                .startWith(Step1)
                .if(data => data.value > 5).do(then => then.startWith(Step2))
                .if(data => data.value > 10).do(then => then.startWith(Step3))
                .then(Step4);                 
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
        host.registerWorkflow(Data_Workflow);
        await host.start();
        workflowId = await host.startWorkflow("if-workflow", 1, { value: 7 });
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
        expect(workflowScope.step1Ticker).toBe(1);
        expect(workflowScope.step2Ticker).toBe(1);
        expect(workflowScope.step3Ticker).toBe(0);
        expect(workflowScope.step4Ticker).toBe(1);
    });

});