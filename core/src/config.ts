import { Container, ContainerModule, interfaces, injectable, inject } from "inversify";
import { TYPES, IQueueProvider, IWorkflowHost, IPersistenceProvider, IDistributedLockProvider, IWorkflowExecutor, IBackgroundWorker, ILogger } from "./abstractions";
import { SingleNodeQueueProvider, SingleNodeLockProvider, MemoryPersistenceProvider, WorkflowExecutor, WorkflowQueueWorker, EventQueueWorker, PollWorker, WorkflowRegistry, WorkflowHost, NullLogger } from "./services";


export function configure(): Container {
    let workflowModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
        bind<IQueueProvider>(TYPES.IQueueProvider).to(SingleNodeQueueProvider);
        bind<IPersistenceProvider>(TYPES.IPersistenceProvider).to(MemoryPersistenceProvider);
        bind<IDistributedLockProvider>(TYPES.IDistributedLockProvider).to(SingleNodeLockProvider);
        bind<IWorkflowExecutor>(TYPES.IWorkflowExecutor).to(WorkflowExecutor);
        bind<IWorkflowHost>(TYPES.IWorkflowHost).to(WorkflowHost);
        bind<WorkflowRegistry>(WorkflowRegistry).toSelf();

        bind<IBackgroundWorker>(TYPES.IBackgroundWorker).to(WorkflowQueueWorker);
        bind<IBackgroundWorker>(TYPES.IBackgroundWorker).to(EventQueueWorker);        
        bind<IBackgroundWorker>(TYPES.IBackgroundWorker).to(PollWorker);
        
        bind<ILogger>(TYPES.ILogger).to(NullLogger);

    });

    let container = new Container();
    container.load(workflowModule);

    return container;
}



