import { injectable, inject } from "inversify";
import { ILogger } from "../abstractions";

@injectable()
export class NullLogger implements ILogger {
    public error(message?: any, ...optionalParams: any[]): void {

    }
    
    public info(message?: any, ...optionalParams: any[]): void {

    }
    
    public log(message?: any, ...optionalParams: any[]): void {
        
    }
}