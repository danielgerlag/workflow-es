import { injectable, inject } from "inversify";
import { IDistributedLockProvider, TYPES, ILogger } from 'workflow-es';
import Redis from 'ioredis';
import Redlock from 'redlock';

@injectable()
export class RedisLockManager implements IDistributedLockProvider {

    private leaseDuration: number = 60;
    private leases: Map<string, any> = new Map<string, any>();
    private renewTimer: any;
    private redis: Redis
    private redlock: Redlock;

    constructor(connection: Redis) {
        this.redis = connection;
        this.redlock = new Redlock(connection);
        this.renewTimer = setInterval(this.renewLeases, 45, this);
    }

    public async aquireLock(id: string): Promise<boolean> {
        try {
            let lock = await this.redlock.lock(id, this.leaseDuration * 1000);
            this.leases.set(id, lock);
            return true;
        }
        catch {
            return false;
        }        
    }

    public async releaseLock(id: string): Promise<void> {
        let lock = this.leases.get(id);
        if (lock) {
            lock.unlock();
            this.leases.delete(id);
        }
    }

    private renewLeases(self: RedisLockManager) {
        self.leases.forEach(lock => {
            lock.renew(self.leaseDuration * 1000);
        });
    }
}