import { Promise } from "es6-promise";

export interface IDistributedLockProvider {
    aquireLock(id: string): Promise<boolean>;
    releaseLock(id: string): Promise<void>;
}