import { IDistributedLockProvider } from "../abstractions";

// Single node in-memory implementation of IDistributedLockProvider (not really distributed)
export class SingleNodeLockProvider implements IDistributedLockProvider {
    
    private locks: Array<string> = [];

    public async aquireLock(id: string): Promise<boolean> {
        if (this.locks.indexOf(id) > -1) {
            return false;
        }
        this.locks.push(id);
        return true;       
    }

    public async releaseLock(id: string): Promise<void> {        
        if (this.locks.indexOf(id) > -1) {
            this.locks.splice(this.locks.indexOf(id), 1);
        }
    }
}