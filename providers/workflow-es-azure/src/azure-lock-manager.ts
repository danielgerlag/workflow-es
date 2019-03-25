import { injectable, inject } from "inversify";
import { BlobService, createBlobServiceWithSas, createBlobService, ErrorOrResult, ErrorOrResponse, ServiceResponse } from "azure-storage";
import { IDistributedLockProvider, TYPES, ILogger } from 'workflow-es';

@injectable()
export class AzureLockManager implements IDistributedLockProvider {

    private blobService: BlobService;
    private containerId: string = 'workflowlocks';
    private leaseDuration: number = 60;
    private leases: any = {};
    private renewTimer: any;

    constructor(connectionString: string) {
        var self = this;
        this.blobService = createBlobService(connectionString);
        this.blobService.createContainerIfNotExists(this.containerId, (error: Error, result: BlobService.ContainerResult, response: ServiceResponse): void => {
            //TODO: log
            self.renewTimer = setInterval(this.renewLeases, 45000, self);
        });    
    }

    public async aquireLock(id: string): Promise<boolean> {
        var self = this;
        
        if (!await this.createBlob(id))
            return false;

        return new Promise<boolean>((resolve, reject) => {
            self.blobService.acquireLease(self.containerId, id, { leaseDuration: self.leaseDuration }, (error: Error, result: BlobService.LeaseResult, response: ServiceResponse): void => {
                if (response.isSuccessful) {
                    self.leases[id] = result.id;
                }
                resolve(response.isSuccessful);
            });
        });
    }

    public async releaseLock(id: string): Promise<void> {
        var self = this;
        let leaseId = this.leases[id];
        
        if (!leaseId)
            return Promise.resolve();

        self.leases[id] = null;
        
        return new Promise<void>((resolve, reject) => {
            self.blobService.releaseLease(self.containerId, id, leaseId, (error: Error, result: BlobService.LeaseResult, response: ServiceResponse): void => {
                resolve();
            });
        });
    }
    

    private createBlob(id: string): Promise<boolean> {
        var self = this;
        return new Promise<boolean>((resolve, reject) => {
            self.blobService.createBlockBlobFromText(self.containerId, id, '', (error: Error, result: BlobService.BlobResult, response: ServiceResponse): void => {                
                resolve(response.isSuccessful);                
            });
        });
    }

    private renewLeases(self: AzureLockManager) {
        for (let id in self.leases) {
            if (self.leases[id]) {
                self.blobService.renewLease(self.containerId, id, self.leases[id], (error: Error, result: BlobService.LeaseResult, response: ServiceResponse): void => {
                    //TODO: log
                });
            }
        }
    }

}