import { Container, ContainerModule, interfaces, injectable, inject } from "inversify";
import { TYPES, IQueueProvider, IPersistenceProvider, IDistributedLockProvider, IWorkflowExecutor, IBackgroundWorker } from "./abstractions";
import { SingleNodeQueueProvider, SingleNodeLockProvider, MemoryPersistenceProvider, WorkflowExecutor, WorkflowQueueWorker } from "./services";

export * from "./services"
export * from "./models"
export * from "./abstractions"

export function configure(): Container {
    let workflowModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
        bind<IQueueProvider>(TYPES.IQueueProvider).to(SingleNodeQueueProvider);
        bind<IPersistenceProvider>(TYPES.IPersistenceProvider).to(MemoryPersistenceProvider);
        bind<IDistributedLockProvider>(TYPES.IDistributedLockProvider).to(SingleNodeLockProvider);
        bind<IWorkflowExecutor>(TYPES.IWorkflowExecutor).to(WorkflowExecutor);

        bind<IBackgroundWorker>(TYPES.IBackgroundWorker).to(WorkflowQueueWorker);        

    });

    let container = new Container();
    container.load(workflowModule);

    return container;
}



