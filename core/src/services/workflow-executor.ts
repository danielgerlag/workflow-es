import { injectable, inject } from "inversify";
import { IPersistenceProvider, ILogger, IWorkflowExecutor, TYPES } from "../abstractions";
import { WorkflowHost } from "./workflow-host";
import { WorkflowRegistry } from "./workflow-registry";
import { WorkflowInstance, ExecutionPointer, ExecutionResult, StepExecutionContext, WorkflowStepBase, SubscriptionStep, SubscriptionStepBody, WorkflowStatus, ExecutionError, WorkflowErrorHandling, ExecutionPipelineDirective, WorkflowExecutorResult } from "../models";
 
var _ = require("underscore");

@injectable()
export class WorkflowExecutor implements IWorkflowExecutor {

    @inject(WorkflowRegistry)
    private registry : WorkflowRegistry;

    @inject(TYPES.ILogger)
    private logger : ILogger;
    
    public async execute(instance: WorkflowInstance): Promise<WorkflowExecutorResult> {
        var self = this;

        var result: WorkflowExecutorResult = new WorkflowExecutorResult();
        
        self.logger.log("Execute workflow: " + instance.id);
        var exePointers: Array<ExecutionPointer> = _.where(instance.executionPointers, { active: true });
        var def = self.registry.getDefinition(instance.workflowDefinitionId, instance.version);
        if (!def) {
            throw "No workflow definition in registry for " + instance.workflowDefinitionId + ":" + instance.version;
        }

        for (let pointer of exePointers) {
            var step: WorkflowStepBase = _.findWhere(def.steps, { id: pointer.stepId });
            if (step) {
                try {
                    
                    switch (step.initForExecution(result, def, instance, pointer)) {
                        case ExecutionPipelineDirective.Defer:
                            continue;
                        case ExecutionPipelineDirective.EndWorkflow:
                            instance.status = WorkflowStatus.Complete;
                            instance.completeTime = new Date();
                            continue;
                    }
                    
                    if (!pointer.startTime)
                        pointer.startTime = new Date();

                    //log starting step
                    var stepContext = new StepExecutionContext();
                    stepContext.persistenceData = pointer.persistenceData;
                    stepContext.step = step;
                    stepContext.workflow = instance;                        
                    
                    var body = new step.body(); //todo: di

                    //inputs
                    for (let input of step.inputs) {
                        input(body, instance.data);
                    }

                    //set event data
                    if (body instanceof SubscriptionStepBody) {
                        body.eventData = pointer.eventData;
                    }

                    switch (step.beforeExecute(result, stepContext, pointer, body)) {
                        case ExecutionPipelineDirective.Defer:
                            continue;
                        case ExecutionPipelineDirective.EndWorkflow:
                            instance.status = WorkflowStatus.Complete;                            
                            instance.completeTime = new Date();
                            continue;
                    }

                    //execute
                    var stepResult = await body.run(stepContext);

                    //outputs
                    for (let output of step.outputs) {
                        output(body, instance.data);
                    }

                    this.processExecutionResult(stepResult, pointer, instance, step);
                }
                catch (err) {
                    self.logger.error("Error executing workflow %s on step %s - %o", instance.id, pointer.stepId, err);
                    
                    switch (step.errorBehavior) {
                        case WorkflowErrorHandling.Retry:
                            pointer.sleepUntil = (Date.now() + step.retryInterval);
                            break;
                        case WorkflowErrorHandling.Suspend:
                            instance.status = WorkflowStatus.Suspended;
                            break;
                        case WorkflowErrorHandling.Terminate:
                            instance.status = WorkflowStatus.Terminated;
                            break;
                        default:
                            pointer.sleepUntil = (Date.now() + 60000);
                            break;
                    }
                    
                    var perr = new ExecutionError();
                    perr.message = err.message;
                    perr.errorTime = new Date();
                    pointer.errors.push(perr);
                }
            }
            else {
                self.logger.error("Could not find step on workflow %s %s", instance.id, pointer.stepId);
                pointer.sleepUntil = (Date.now() + 60000); //todo: make configurable
            }
        }

        self.determineNextExecutionTime(instance);        
        return result;
    }

    processExecutionResult(stepResult: ExecutionResult, pointer: ExecutionPointer, instance: WorkflowInstance, step: WorkflowStepBase) {
        if (stepResult.proceed) {
            pointer.active = false;
            pointer.endTime = new Date();
            var noOutcomes = true;
            var forkCounter: number = 1;
            for (let outcome of _.where(step.outcomes, { value: stepResult.outcomeValue })) {
                noOutcomes = false;
                var newPointer = new ExecutionPointer();
                newPointer.active = true;
                newPointer.stepId = outcome.nextStep;
                newPointer.concurrentFork = (forkCounter * pointer.concurrentFork);
                instance.executionPointers.push(newPointer);
                forkCounter++;
            }
            pointer.pathTerminal = noOutcomes;
        }
        else {
            pointer.persistenceData = stepResult.persistenceData;
            if (stepResult.sleep)
                pointer.sleepUntil = stepResult.sleep.getTime();
        }
    }

    determineNextExecutionTime(instance: WorkflowInstance) {
        instance.nextExecution = null;
        for (let pointer of instance.executionPointers.filter(value => value.active)) {
            if (!pointer.sleepUntil) {
                instance.nextExecution = 0;
                return;
            }
            instance.nextExecution = Math.min(pointer.sleepUntil, instance.nextExecution ? instance.nextExecution : pointer.sleepUntil);
        }
        if (instance.nextExecution === null) {            
            var forks: number = 1
            var terminals: number = 0;
            for (let pointer of instance.executionPointers) {
                forks = Math.max(pointer.concurrentFork, forks);
                if (pointer.pathTerminal)
                    terminals++;
            }
            if (forks <= terminals)
                instance.status = WorkflowStatus.Complete;
        }
    }

}