import { IDistributedLockProvider } from "../abstractions";

// Single node in-memory implementation of IDistributedLockProvider (not really distributed)
export class SingleNodeLockProvider implements IDistributedLockProvider {
    
    private locks: Array<string> = [];


    public aquireLock(id: string): Promise<boolean> {
        var self = this;
        var deferred = new Promise<boolean>((resolve, reject) => {
            if (self.locks.indexOf(id) > -1) {
                resolve(false);
                return;
            }
            self.locks.push(id);
            resolve(true);
        });
        return deferred;        
    }

    public releaseLock(id: string): Promise<void> {
        var self = this;
        var deferred = new Promise<void>((resolve, reject) => {
            if (self.locks.indexOf(id) > -1) {
                self.locks.splice(self.locks.indexOf(id), 1);
            }
            resolve();
        });
        return deferred;
    }
}