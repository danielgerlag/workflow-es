import { inject, injectable } from "inversify";
import { WorkflowInstance, WorkflowStatus, ExecutionPointer, EventSubscription, Event } from "../models";
import { WorkflowBase, IPersistenceProvider, IWorkflowHost, IQueueProvider, IDistributedLockProvider, IWorkflowExecutor, ILogger, TYPES, QueueType, IBackgroundWorker } from "../abstractions";
import { WorkflowRegistry } from "./workflow-registry";
import { WorkflowExecutor } from "./workflow-executor";

@injectable()
export class PollWorker implements IBackgroundWorker {

    @inject(TYPES.IPersistenceProvider)
    private persistence: IPersistenceProvider;

    @inject(TYPES.IDistributedLockProvider)
    private lockProvider: IDistributedLockProvider;

    @inject(TYPES.IQueueProvider)
    private queueProvider:  IQueueProvider;

    @inject(TYPES.ILogger)
    private logger: ILogger;

    private processTimer: any;

    public start() {        
        this.processTimer = setInterval(this.process, 10000, this);
    }

    public stop() {
        this.logger.log("Stopping poll worker...");        
        if (this.processTimer)
            clearInterval(this.processTimer);
    }

    private async process(): Promise<void> {                
        this.logger.info("pollRunnables " + " - now = " + Date.now());
        try {        
            var runnables = await this.persistence.getRunnableInstances();
            for (let item of runnables) {                    
                this.queueProvider.queueForProcessing(item, QueueType.Workflow);
            }
        }
        catch (err) {
            this.logger.error("Error running poll: " + err);
        }
    }
}