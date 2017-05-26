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

    private async process(self: PollWorker): Promise<void> {                
        self.logger.info("pollRunnables " + " - now = " + Date.now());
        try {        
            let runnables = await self.persistence.getRunnableInstances();
            for (let item of runnables) {                    
                self.queueProvider.queueForProcessing(item, QueueType.Workflow);
            }
        }
        catch (err) {
            self.logger.error("Error running poll: " + err);
        }
    }
}