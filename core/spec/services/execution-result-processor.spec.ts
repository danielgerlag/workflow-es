import { configureWorkflow, WorkflowHost, WorkflowBuilder, WorkflowStatus, WorkflowBase, StepBody, StepExecutionContext, ExecutionResult, WorkflowInstance, ConsoleLogger, ExecutionPointer, PointerStatus, StepOutcome, WorkflowStep, WorkflowExecutorResult } from "../../src";
import { ExecutionResultProcessor } from "../../src/services/execution-result-processor";
import { NullLogger } from "../../src/services/null-logger";
import { spinWaitCallback } from "../helpers/spin-wait";
import { inspect } from "util";

 describe("ExecutionResultProcessor", () => {
       
    let subject: any = new ExecutionResultProcessor();
    subject.logger = new NullLogger();
    
    beforeEach(() => {
        subject.pointerFactory = { buildNextPointer: function() {} }
    });    

    it("should advance workflow", function() {
        //arrange
        let pointer1 = new ExecutionPointer();
        pointer1.active = true;
        pointer1.stepId = 0;
        pointer1.status = PointerStatus.Running;
        let pointer2 = new ExecutionPointer();        
        let outcome = new StepOutcome();
        outcome.nextStep = 1;
        let step = new WorkflowStep();
        step.outcomes.push(outcome);
        let instance = givenWorkflow([pointer1]);        
        let wfResult = new WorkflowExecutorResult();
        let stepResult = new ExecutionResult();
        stepResult.proceed = true;
        stepResult.outcomeValue = null;
        spyOn(subject.pointerFactory, "buildNextPointer").and.returnValue(pointer2);

        //act
        subject.processExecutionResult(stepResult, pointer1, instance, step, wfResult);

        //assert
        expect(pointer1.active).toBe(false);
        expect(pointer1.status).toBe(PointerStatus.Complete);
        expect(pointer1.endTime).toBeDefined();
        expect(instance.executionPointers).toContain(pointer2);
        expect(subject.pointerFactory.buildNextPointer).toHaveBeenCalled();
    });

    it("should set persistence data", function() {
        //arrange
        let data = new Object();
        let pointer = new ExecutionPointer();
        pointer.active = true;
        pointer.stepId = 0;
        pointer.status = PointerStatus.Running;
        let step = new WorkflowStep();
        let instance = givenWorkflow([pointer]);
        let wfResult = new WorkflowExecutorResult();
        let stepResult = new ExecutionResult();
        stepResult.proceed = false;
        stepResult.persistenceData = data;
        
        //act
        subject.processExecutionResult(stepResult, pointer, instance, step, wfResult);

        //assert
        expect(pointer.persistenceData).toBe(data);
    });

    it("should subscribe to event", function() {
        //arrange
        let pointer = new ExecutionPointer();
        pointer.active = true;
        pointer.stepId = 0;
        pointer.status = PointerStatus.Running;
        let step = new WorkflowStep();
        let instance = givenWorkflow([pointer]);
        let wfResult = new WorkflowExecutorResult();
        let stepResult = new ExecutionResult();
        stepResult.proceed = false;
        stepResult.eventKey = "key";
        stepResult.eventName = "event";
                
        //act
        subject.processExecutionResult(stepResult, pointer, instance, step, wfResult);

        //assert
        expect(pointer.active).toBe(false);
        expect(pointer.status).toBe(PointerStatus.WaitingForEvent);
        expect(pointer.eventName).toBe(stepResult.eventName);
        expect(pointer.eventKey).toBe(stepResult.eventKey);
        expect(wfResult.subscriptions.length).toBe(1);
    });

});


function givenWorkflow(pointers): WorkflowInstance {
    let result = new WorkflowInstance();
    result.status = WorkflowStatus.Runnable;
    result.executionPointers.push(pointers);
    return result;
}