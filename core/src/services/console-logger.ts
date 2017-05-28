import { injectable, inject } from "inversify";
import { ILogger } from "../abstractions";

@injectable()
export class ConsoleLogger implements ILogger {
    public error(message?: any, ...optionalParams: any[]): void {
        console.error(message, ...optionalParams);
    }
    
    public info(message?: any, ...optionalParams: any[]): void {
        console.info(message, ...optionalParams);
    }
    
    public log(message?: any, ...optionalParams: any[]): void {
        console.log(message, ...optionalParams);
    }
}