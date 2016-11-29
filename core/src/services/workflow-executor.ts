import { Promise } from "es6-promise";
import { IPersistenceProvider, ILogger, IWorkflowExecutor } from "../abstractions";
import { WorkflowHost } from "./workflow-host";
import { WorkflowRegistry } from "./workflow-registry";
import { WorkflowInstance, ExecutionPointer, ExecutionResult, StepExecutionContext, WorkflowStepBase, SubscriptionStep, SubscriptionStepBody, WorkflowStatus } from "../models";

var _ = require("underscore");

export class WorkflowExecutor implements IWorkflowExecutor {

    constructor(
        private host: WorkflowHost,
        private persistence: IPersistenceProvider,
        private registry: WorkflowRegistry,
        private logger: ILogger) {

    }

    public Execute(instance: WorkflowInstance): Promise<void> {
        var self = this;
        var deferred = new Promise<void>((resolve, reject) => {
            self.logger.log("Execute workflow: " + instance.id);
            var exePointers: Array<ExecutionPointer> = _.where(instance.executionPointers, { active: true });
            var def = self.registry.getDefinition(instance.workflowDefinitionId, instance.version);
            if (!def) {
                reject("No workflow definition in registry for " + instance.workflowDefinitionId + ":" + instance.version);
                return;
            }

            var promiseList: Array<Promise<ExecutionResult>> = [];

            for (let pointer of exePointers) {

                var step: WorkflowStepBase = _.findWhere(def.steps, { id: pointer.stepId });
                if (step) {
                    try {
                        if ((step instanceof SubscriptionStep) && (!pointer.eventPublished)) {
                            pointer.eventKey = step.eventKey;
                            pointer.eventName = step.eventName;
                            pointer.active = false;
                            self.persistence.persistWorkflow(instance).then(() => {
                                var subStep = (step as SubscriptionStep);
                                self.host.subscribeEvent(instance.id, pointer.stepId, subStep.eventName, subStep.eventKey);
                                resolve();                                
                            });
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

                        //execute                
                        var stepPromise = body.run(stepContext);
                        promiseList.push(stepPromise);
                        stepPromise
                            .then(stepResult => {
                                if (stepResult.proceed) {
                                    //outputs
                                    for (let output of step.outputs) {
                                        output(body, instance.data);
                                    }

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
                            })
                            .catch(err => {
                                self.logger.error("Error executing workflow %s on step %s - %o", instance.id, pointer.stepId, err);
                                pointer.sleepUntil = (Date.now() + 60000); //todo: make configurable
                                //pointer.errors.push();
                            });
                    }
                    catch (err) {
                        self.logger.error("Error executing workflow %s on step %s - %o", instance.id, pointer.stepId, err);
                        pointer.sleepUntil = (Date.now() + 60000); //todo: make configurable
                        //pointer.errors.push();
                    }
                }
                else {
                    self.logger.error("Could not find step on workflow %s %s", instance.id, pointer.stepId);
                    pointer.sleepUntil = (Date.now() + 60000); //todo: make configurable
                }

            }

            Promise.all(promiseList)
                .then(() => {
                    self.determineNextExecutionTime(instance);
                    self.persistence.persistWorkflow(instance).then(() => {
                        resolve();
                    })
                .catch(err => self.logger.error(err));
                });                        
        });
        return deferred;
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