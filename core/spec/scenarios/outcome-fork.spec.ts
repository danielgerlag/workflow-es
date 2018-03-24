import { WorkflowHost, WorkflowBuilder, WorkflowStatus, WorkflowBase, StepBody, StepExecutionContext, ExecutionResult, WorkflowInstance, configureWorkflow, ConsoleLogger } from "../../src";
import { MemoryPersistenceProvider } from "../../src/services/memory-persistence-provider";
import { spinWaitCallback } from "../helpers/spin-wait";

let outcomeForkScope = {
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

    let workflowId = null;
    let instance = null;
    let persistence = new MemoryPersistenceProvider();
    let config = configureWorkflow();
    config.useLogger(new ConsoleLogger());
    config.usePersistence(persistence);
    let host = config.getHost();
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;

    beforeAll(async (done) => {
        host.registerWorkflow(Outcome_Workflow);
        await host.start();

        workflowId = await host.startWorkflow("outcome-workflow", 1, null);
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