import { Container, ContainerModule, interfaces, injectable, inject } from "inversify";
import { TYPES, IWorkflowRegistry, IQueueProvider, IWorkflowHost, IPersistenceProvider, IDistributedLockProvider, IWorkflowExecutor, IBackgroundWorker, ILogger } from "./abstractions";
import { SingleNodeQueueProvider, SingleNodeLockProvider, MemoryPersistenceProvider, WorkflowExecutor, WorkflowQueueWorker, EventQueueWorker, PollWorker, WorkflowRegistry, WorkflowHost, NullLogger, ConsoleLogger } from "./services";


export function configure(): Container {
    let workflowModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
        bind<ILogger>(TYPES.ILogger).to(ConsoleLogger);
        //bind(TYPES.ILogger).to(console);

        bind<IQueueProvider>(TYPES.IQueueProvider).to(SingleNodeQueueProvider);
        bind<IPersistenceProvider>(TYPES.IPersistenceProvider).to(MemoryPersistenceProvider);
        bind<IDistributedLockProvider>(TYPES.IDistributedLockProvider).to(SingleNodeLockProvider);
        bind<IWorkflowRegistry>(TYPES.IWorkflowRegistry).to(WorkflowRegistry);
        bind<IWorkflowExecutor>(TYPES.IWorkflowExecutor).to(WorkflowExecutor);        

        bind<IBackgroundWorker>(TYPES.IBackgroundWorker).to(WorkflowQueueWorker);
        bind<IBackgroundWorker>(TYPES.IBackgroundWorker).to(EventQueueWorker);        
        bind<IBackgroundWorker>(TYPES.IBackgroundWorker).to(PollWorker);
                
        bind<IWorkflowHost>(TYPES.IWorkflowHost).to(WorkflowHost);
        
    });

    let container = new Container();
    container.load(workflowModule);
    
    return container;
}



