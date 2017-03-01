
export class ExecutionResult {
    public proceed: boolean;
    public outcomeValue: any;
    public persistenceData: any;    
    public sleep: Date;

    static outcome(value: any): ExecutionResult {
        var result = new ExecutionResult();
        result.outcomeValue = value;
        result.proceed = true;
        return result;
    }

    static resolveOutcome(value: any): Promise<ExecutionResult> {
        var result = new ExecutionResult();
        result.outcomeValue = value;
        result.proceed = true;
        return Promise.resolve(result);
    }

    static next(): ExecutionResult {
        var result = new ExecutionResult();
        result.outcomeValue = null;
        result.proceed = true;
        return result;
    }

    static resolveNext(): Promise<ExecutionResult> {
        var result = new ExecutionResult();
        result.outcomeValue = null;
        result.proceed = true;
        return Promise.resolve(result);
    }

    

    static persist(persistenceData: any): ExecutionResult {
        var result = new ExecutionResult();        
        result.proceed = false;
        result.persistenceData = persistenceData;
        return result;
    }

    static resolvePersist(persistenceData: any): Promise<ExecutionResult> {
        var result = new ExecutionResult();        
        result.proceed = false;
        result.persistenceData = persistenceData;
        return Promise.resolve(result);
    }

    static sleep(until: Date, persistenceData: any): ExecutionResult {
        var result = new ExecutionResult();        
        result.proceed = false;
        result.persistenceData = persistenceData;
        result.sleep = until;
        return result;
    }

    static resolveSleep(until: Date, persistenceData: any): Promise<ExecutionResult> {
        var result = new ExecutionResult();        
        result.proceed = false;
        result.persistenceData = persistenceData;
        result.sleep = until;
        return Promise.resolve(result);
    }
}