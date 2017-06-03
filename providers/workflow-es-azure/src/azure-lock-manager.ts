import { BlobService, createBlobServiceWithSas, createBlobService, ErrorOrResult, ErrorOrResponse, ServiceResponse } from "azure-storage";
import { IDistributedLockProvider } from 'workflow-es';

export class AzureLockManager implements IDistributedLockProvider {

    private blobService: BlobService;
    private containerId: string = 'workflowlocks';
    private leaseDuration: number = 60;
    private leases: any = {};
    private renewTimer: number;

    constructor() {
        this.blobService = createBlobService('UseDevelopmentStorage=true');
        this.blobService.createContainerIfNotExists(this.containerId, (error: Error, result: BlobService.ContainerResult, response: ServiceResponse): void => {
            //
            this.renewTimer = setInterval(this.renewLeases, 45);
            //clearInterval()
        });    
    }

    public async aquireLock(id: string): Promise<boolean> {
        if (!await this.createBlob(id))
            return false;

        return new Promise<boolean>((resolve, reject) => {
            this.blobService.acquireLease(this.containerId, id, { leaseDuration: this.leaseDuration }, (error: Error, result: BlobService.LeaseResult, response: ServiceResponse): void => {
                if (response.isSuccessful) {
                    this.leases[id] = result.id;
                }
                resolve(response.isSuccessful);
            });
        });
    }

    public async releaseLock(id: string): Promise<void> {
        let leaseId = this.leases[id];
        
        if (!leaseId)
            return Promise.resolve();

        this.leases[id] = null;
        
        return new Promise<void>((resolve, reject) => {
            this.blobService.releaseLease(this.containerId, id, leaseId, (error: Error, result: BlobService.LeaseResult, response: ServiceResponse): void => {
                resolve();
            });
        });
    }
    

    private createBlob(id: string): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            this.blobService.createBlockBlobFromText(this.containerId, id, '', (error: Error, result: BlobService.BlobResult, response: ServiceResponse): void => {                
                resolve(response.isSuccessful);                
            });
        });
    }

    private renewLeases(self: AzureLockManager) {
        for (let id in self.leases) {
            if (self.leases[id]) {
                self.blobService.renewLease(self.containerId, id, self.leases[id], (error: Error, result: BlobService.LeaseResult, response: ServiceResponse): void => {
                    //logging
                });
            }
        }
    }

}