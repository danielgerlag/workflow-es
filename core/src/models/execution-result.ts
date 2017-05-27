
export class ExecutionResult {
    public proceed: boolean;
    public outcomeValue: any;
    public persistenceData: any;    
    public sleep: Date;
    public branchValues: any[] = [];

    static outcome(value: any): Promise<ExecutionResult> {
        var result = new ExecutionResult();
        result.outcomeValue = value;
        result.proceed = true;
        return Promise.resolve(result);
    }

    static next(): Promise<ExecutionResult> {
        var result = new ExecutionResult();
        result.outcomeValue = null;
        result.proceed = true;
        return Promise.resolve(result);
    }
    
    static persist(persistenceData: any): Promise<ExecutionResult> {
        var result = new ExecutionResult();        
        result.proceed = false;
        result.persistenceData = persistenceData;
        return Promise.resolve(result);
    }

    static sleep(until: Date, persistenceData: any): Promise<ExecutionResult> {
        var result = new ExecutionResult();        
        result.proceed = false;
        result.persistenceData = persistenceData;
        result.sleep = until;
        return Promise.resolve(result);
    }

    static branch(branches: any[], persistenceData: any): Promise<ExecutionResult> {
        var result = new ExecutionResult();
        result.proceed = false;
        result.persistenceData = persistenceData;
        result.branchValues = branches;
        return Promise.resolve(result);
    }
}