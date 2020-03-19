import { Container } from "inversify";

export interface IBackgroundWorker {
    updateFromContainer(container: Container);
    start();
    stop();
}