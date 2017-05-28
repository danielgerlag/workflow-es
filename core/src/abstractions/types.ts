let TYPES = {    
    IWorkflowRegistry: Symbol("IWorkflowRegistry"),
    IWorkflowHost: Symbol("IWorkflowHost"),
    IDistributedLockProvider: Symbol("IDistributedLockProvider"),
    ILogger: Symbol("ILogger"),
    IPersistenceProvider: Symbol("IPersistenceProvider"),
    IQueueProvider: Symbol("IQueueProvider"),
    IBackgroundWorker: Symbol("IBackgroundWorker"),
    IWorkflowExecutor: Symbol("IWorkflowExecutor")    
};

export { TYPES };