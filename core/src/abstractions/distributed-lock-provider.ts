
export interface IDistributedLockProvider {
    aquireLock(id: string): Promise<boolean>;
    releaseLock(id: string): Promise<void>;
}