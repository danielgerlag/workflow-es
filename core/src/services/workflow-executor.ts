import { injectable, inject } from "inversify";
import { IPersistenceProvider, ILogger, IWorkflowRegistry, IWorkflowExecutor, TYPES, IExecutionResultProcessor } from "../abstractions";
import { WorkflowHost } from "./workflow-host";
import { WorkflowInstance, WorkflowDefinition, ExecutionPointer, PointerStatus, ExecutionResult, StepExecutionContext, WorkflowStepBase, WorkflowStatus, ExecutionError, WorkflowErrorHandling, ExecutionPipelineDirective, WorkflowExecutorResult } from "../models";

@injectable()
export class WorkflowExecutor implements IWorkflowExecutor {

    @inject(TYPES.IWorkflowRegistry)
    private registry : IWorkflowRegistry;

    @inject(TYPES.IExecutionResultProcessor)
    private resultProcessor : IExecutionResultProcessor;

    @inject(TYPES.ILogger)
    private logger : ILogger;
    
    public async execute(instance: WorkflowInstance): Promise<WorkflowExecutorResult> {

        let result: WorkflowExecutorResult = new WorkflowExecutorResult();
        
        this.logger.log("Execute workflow: " + instance.id);                

        let exePointers: Array<ExecutionPointer> = instance.executionPointers.filter(x => x.active);

        let def = this.registry.getDefinition(instance.workflowDefinitionId, instance.version);
        if (!def) {
            throw "No workflow definition in registry for " + instance.workflowDefinitionId + ":" + instance.version;
        }

        for (let pointer of exePointers) {
            let step: WorkflowStepBase = def.steps.find(x => x.id == pointer.stepId);
            if (step) {
                try {
                    pointer.status = PointerStatus.Running;
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

                    this.resultProcessor.processExecutionResult(stepResult, pointer, instance, step, result);
                }
                catch (err) {
                    this.logger.error("Error executing workflow %s on step %s - %o", instance.id, pointer.stepId, err);
                    let perr = new ExecutionError();
                    perr.message = err.message;
                    perr.errorTime = new Date();
                    result.errors.push(perr);

                    this.resultProcessor.handleStepException(instance, def, pointer, step);
                }
            }
            else {
                this.logger.error("Could not find step on workflow %s %s", instance.id, pointer.stepId);
                pointer.sleepUntil = (Date.now() + 60000); //todo: make configurable
            }
        }

        this.processAfterExecutionIteration(instance, def, result);
        this.determineNextExecutionTime(instance);
        return result;
    }

    processAfterExecutionIteration(workflow: WorkflowInstance, defintion: WorkflowDefinition, workflowResult: WorkflowExecutorResult) {
        let pointers = workflow.executionPointers.filter(x => !x.endTime);

        for (let pointer of pointers) {
            let step = defintion.steps.find(x => x.id == pointer.stepId);
            if (step)
                step.afterWorkflowIteration(workflowResult, defintion, workflow, pointer);
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
                
                if (!instance.executionPointers.filter(x => x.scope.includes(pointer.id)).every(x => !!x.endTime)) 
                    continue;
                
                if (!pointer.sleepUntil) {
                    instance.nextExecution = 0;
                    return;
                }
                instance.nextExecution = Math.min(pointer.sleepUntil, instance.nextExecution ? instance.nextExecution : pointer.sleepUntil);
            }            
        }

        if ((instance.nextExecution === null) && (instance.executionPointers.every(x => Boolean(x.endTime)))) {
            instance.completeTime = new Date();
            instance.status = WorkflowStatus.Complete;
        }
    }    
}