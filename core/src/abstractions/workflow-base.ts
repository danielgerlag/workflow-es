import { WorkflowBuilder } from "../fluent-builders";

export abstract class WorkflowBase<TData> {
    public abstract id: string;
    public abstract version: number;
    public abstract build(builder: WorkflowBuilder<TData>);
}