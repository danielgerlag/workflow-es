import { inject, injectable, Container } from "inversify";
import { WorkflowInstance, WorkflowStatus, ExecutionPointer, EventSubscription, Event } from "../models";
import { WorkflowBase, IPersistenceProvider, IWorkflowHost, IQueueProvider, IDistributedLockProvider, IWorkflowExecutor, ILogger, TYPES, QueueType, IPollWorker } from "../abstractions";
import { WorkflowRegistry } from "./workflow-registry";
import { WorkflowExecutor } from "./workflow-executor";

@injectable()
export class PollWorker implements IPollWorker {

    @inject(TYPES.IPersistenceProvider)
    private persistence: IPersistenceProvider;

    @inject(TYPES.IDistributedLockProvider)
    private lockProvider: IDistributedLockProvider;

    @inject(TYPES.IQueueProvider)
    private queueProvider:  IQueueProvider;

    @inject(TYPES.ILogger)
    private logger: ILogger;

    private processTimer: any;
    private interval = 10000;

    public setInterval(ms: number) {
        this.interval = ms;
    }

    public getInterval() {
        return this.interval;
    }

    public updateFromContainer(container: Container) {
        this.persistence = container.get(TYPES.IPersistenceProvider);
        this.lockProvider = container.get(TYPES.IDistributedLockProvider);
        this.queueProvider = container.get(TYPES.IQueueProvider);
        this.logger = container.get(TYPES.ILogger);
    }

    public start() {        
        this.processTimer = setInterval(this.process, this.interval, this);
    }

    public stop() {
        this.logger.log("Stopping poll worker...");        
        if (this.processTimer)
            clearInterval(this.processTimer);
    }

    private async process(self: PollWorker): Promise<void> {                
        self.logger.info("pollRunnables " + " - now = " + Date.now());
        //TODO: lock
        try {        
            let runnables = await self.persistence.getRunnableInstances();
            for (let item of runnables) {                    
                self.queueProvider.queueForProcessing(item, QueueType.Workflow);
            }
        }
        catch (err) {
            self.logger.error("Error running poll: " + err);
        }

        try {
            let events = await self.persistence.getRunnableEvents();
            for (let item of events) {
                self.queueProvider.queueForProcessing(item, QueueType.Event);
            }
        }
        catch (err) {
            self.logger.error("Error running poll: " + err);
        }
    }
}