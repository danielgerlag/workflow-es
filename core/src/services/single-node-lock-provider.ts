import { injectable, inject } from "inversify";
import { IDistributedLockProvider } from "../abstractions";

var wfc_locks: Array<string> = [];

// Single node in-memory implementation of IDistributedLockProvider (not really distributed)
@injectable()
export class SingleNodeLockProvider implements IDistributedLockProvider {
    
    public async aquireLock(id: string): Promise<boolean> {
        if (wfc_locks.indexOf(id) > -1) {
            return false;
        }
        wfc_locks.push(id);
        return true;       
    }

    public async releaseLock(id: string): Promise<void> {        
        if (wfc_locks.indexOf(id) > -1) {
            wfc_locks.splice(wfc_locks.indexOf(id), 1);
        }
    }
}