import { ILogger } from "../abstractions";

export class NullLogger implements ILogger {
    public error(message?: any, ...optionalParams: any[]): void {

    }
    
    public info(message?: any, ...optionalParams: any[]): void {

    }
    
    public log(message?: any, ...optionalParams: any[]): void {
        
    }
}