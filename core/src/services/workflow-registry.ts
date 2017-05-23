import { injectable, inject } from "inversify";
import { WorkflowDefinition } from "../models"
import { WorkflowBase } from "../abstractions"
import { WorkflowBuilder } from "./workflow-builder";

var _ = require("underscore");

@injectable()
export class WorkflowRegistry {

    private _registry: Array<RegistryEntry> = [];

    public getDefinition(id: string, version: number) : WorkflowDefinition {
        var item = _.findWhere(this._registry, { id: id, version: version });
        if (!item)
            throw "Workflow not registered";
             
        return item.defintion;
    }

    public registerWorkflow<TData>(workflow: WorkflowBase<TData>) {
        var entry = new RegistryEntry();
        entry.id = workflow.id;
        entry.version = workflow.version;
        var builder = new WorkflowBuilder<TData>();
        workflow.build(builder);
        entry.defintion = builder.build(workflow.id, workflow.version);        
        this._registry.push(entry);
    }

}

class RegistryEntry {
    public id: string;
    public version: number;
    public defintion: WorkflowDefinition;
}