import "reflect-metadata";
import { Container, ContainerModule, interfaces, injectable, inject } from "inversify";
import { TYPES, IWorkflowRegistry, IQueueProvider, IWorkflowHost, IPersistenceProvider, IDistributedLockProvider, IWorkflowExecutor, IBackgroundWorker, ILogger } from "./abstractions";
import { SingleNodeQueueProvider, SingleNodeLockProvider, MemoryPersistenceProvider, WorkflowExecutor, WorkflowQueueWorker, EventQueueWorker, PollWorker, WorkflowRegistry, WorkflowHost, NullLogger, ConsoleLogger } from "./services";

export class WorkflowConfig {
    private container: Container;

    constructor(container: Container) {
        this.container = container;
    }

    public getContainer(): Container {
        return this.container;
    }

    public useLogger(service: ILogger) {
        this.container.rebind<ILogger>(TYPES.ILogger).toConstantValue(service);
    }

    public usePersistence(service: IPersistenceProvider) {
        this.container.rebind<IPersistenceProvider>(TYPES.IPersistenceProvider).toConstantValue(service);
    }

    public useQueueManager(service: IQueueProvider) {
        this.container.rebind<IQueueProvider>(TYPES.IQueueProvider).toConstantValue(service);
    }

    public useLockManager(service: IDistributedLockProvider) {
        this.container.rebind<IDistributedLockProvider>(TYPES.IDistributedLockProvider).toConstantValue(service);
    }

    public getHost(): IWorkflowHost {
        return this.container.get<IWorkflowHost>(TYPES.IWorkflowHost);
    }
}

export function configureWorkflow(): WorkflowConfig {
    let workflowModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {        
        bind<ILogger>(TYPES.ILogger).to(NullLogger);        
        bind<IQueueProvider>(TYPES.IQueueProvider).to(SingleNodeQueueProvider).inSingletonScope();
        bind<IPersistenceProvider>(TYPES.IPersistenceProvider).to(MemoryPersistenceProvider).inSingletonScope();
        bind<IDistributedLockProvider>(TYPES.IDistributedLockProvider).to(SingleNodeLockProvider).inSingletonScope();
        bind<IWorkflowRegistry>(TYPES.IWorkflowRegistry).to(WorkflowRegistry).inSingletonScope();
        bind<IWorkflowExecutor>(TYPES.IWorkflowExecutor).to(WorkflowExecutor);

        bind<IBackgroundWorker>(TYPES.IBackgroundWorker).to(WorkflowQueueWorker);
        bind<IBackgroundWorker>(TYPES.IBackgroundWorker).to(EventQueueWorker);        
        bind<IBackgroundWorker>(TYPES.IBackgroundWorker).to(PollWorker);

        bind<IWorkflowHost>(TYPES.IWorkflowHost).to(WorkflowHost).inSingletonScope();
        
    });

    let container = new Container();
    container.load(workflowModule);

    let config = new WorkflowConfig(container);
    return config;
}