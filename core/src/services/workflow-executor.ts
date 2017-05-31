import { injectable, inject } from "inversify";
import { IPersistenceProvider, ILogger, IWorkflowRegistry, IWorkflowExecutor, TYPES } from "../abstractions";
import { WorkflowHost } from "./workflow-host";
import { WorkflowInstance, ExecutionPointer, ExecutionResult, StepExecutionContext, WorkflowStepBase, WorkflowStatus, ExecutionError, WorkflowErrorHandling, ExecutionPipelineDirective, WorkflowExecutorResult } from "../models";
 
var _ = require("underscore");

@injectable()
export class WorkflowExecutor implements IWorkflowExecutor {

    @inject(TYPES.IWorkflowRegistry)
    private registry : IWorkflowRegistry;

    @inject(TYPES.ILogger)
    private logger : ILogger;
    
    public async execute(instance: WorkflowInstance): Promise<WorkflowExecutorResult> {
        let self = this;

        let result: WorkflowExecutorResult = new WorkflowExecutorResult();
        
        self.logger.log("Execute workflow: " + instance.id);
        let exePointers: Array<ExecutionPointer> = _.where(instance.executionPointers, { active: true });
        let def = self.registry.getDefinition(instance.workflowDefinitionId, instance.version);
        if (!def) {
            throw "No workflow definition in registry for " + instance.workflowDefinitionId + ":" + instance.version;
        }

        for (let pointer of exePointers) {
            let step: WorkflowStepBase = _.findWhere(def.steps, { id: pointer.stepId });
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
                    let stepContext = new StepExecutionContext();
                    stepContext.persistenceData = pointer.persistenceData;
                    stepContext.step = step;
                    stepContext.workflow = instance;
                    stepContext.item = pointer.contextItem;
                    stepContext.pointer = pointer;
                    
                    let body = new step.body(); //todo: di

                    //inputs
                    for (let input of step.inputs) {
                        input(body, instance.data);
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
                    let stepResult = await body.run(stepContext);

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

                    pointer.retryCount++;
                    let perr = new ExecutionError();
                    perr.message = err.message;
                    perr.errorTime = new Date();
                    result.errors.push(perr);
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

        pointer.persistenceData = stepResult.persistenceData;
        pointer.outcome = stepResult.outcomeValue;
        if (stepResult.sleep)
            pointer.sleepUntil = stepResult.sleep.getTime();

        if (stepResult.proceed) {
            pointer.active = false;
            pointer.endTime = new Date();
            
            for (let outcome of step.outcomes.filter(x => (x.value(instance.data) == stepResult.outcomeValue) || (x.value(instance.data) == null))) {
                let newPointer = new ExecutionPointer();
                newPointer.active = true;
                newPointer.predecessorId = pointer.id;
                newPointer.stepId = outcome.nextStep;
                newPointer.id = (Math.random() * 0x10000000000000).toString(16);
                newPointer.contextItem = pointer.contextItem;
                instance.executionPointers.push(newPointer);
            }
        }
        else {
            for (let branch of stepResult.branchValues) {
                for (let childDefId of step.children) {                    
                    let childPointer = new ExecutionPointer();
                    childPointer.id = (Math.random() * 0x10000000000000).toString(16);
                    childPointer.predecessorId = pointer.id;
                    childPointer.stepId = childDefId;
                    childPointer.active = true;
                    childPointer.contextItem = branch;

                    instance.executionPointers.push(childPointer);
                    pointer.children.push(childPointer.id);
                }
            }
        }
    }

    determineNextExecutionTime(instance: WorkflowInstance) {
        instance.nextExecution = null;

        if (instance.status == WorkflowStatus.Complete)
            return;

        for (let pointer of instance.executionPointers.filter(x => x.active && x.children.length == 0)) {
            if (!pointer.sleepUntil) {
                instance.nextExecution = 0;
                return;
            }
            instance.nextExecution = Math.min(pointer.sleepUntil, instance.nextExecution ? instance.nextExecution : pointer.sleepUntil);
        }
        
        if (instance.nextExecution === null) {            
            for (let pointer of instance.executionPointers.filter(x => x.active && x.children.length > 0)) {
                if (instance.executionPointers.filter(x => x.children.includes(pointer.id)).every(x => this.isBranchComplete(instance.executionPointers, x.id))) {
                    instance.nextExecution = 0;
                    return;
                }
            }            
        }

        if ((instance.nextExecution === null) && (instance.executionPointers.every(x => Boolean(x.endTime)))) {
            instance.completeTime = new Date();
            instance.status = WorkflowStatus.Complete;
        }
    }

    isBranchComplete(pointers: ExecutionPointer[], rootId: string): boolean {
        let root = pointers.find(x => x.id == rootId);

        if (!root.endTime)
            return false;

        let list = pointers.filter(x => x.predecessorId == rootId);

        let result = true;

        for(let item of list)
            result = result && this.isBranchComplete(pointers, item.id);

        return result;
    }

}