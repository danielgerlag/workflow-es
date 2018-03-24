import { injectable, inject } from "inversify";
import { WorkflowDefinition } from "../models"
import { WorkflowBase, IWorkflowRegistry } from "../abstractions"
import { WorkflowBuilder } from "../fluent-builders";

var wfes_registry: Array<RegistryEntry> = [];

@injectable()
export class WorkflowRegistry implements IWorkflowRegistry {
    
    public getDefinition(id: string, version: number) : WorkflowDefinition {
        let item = wfes_registry.find(x => x.id == id && x.version == version);
        if (!item)
            throw "Workflow not registered";
             
        return item.defintion;
    }

    public registerWorkflow<TData>(workflow: WorkflowBase<TData>) {
        let entry = new RegistryEntry();
        entry.id = workflow.id;
        entry.version = workflow.version;
        let builder = new WorkflowBuilder<TData>();
        workflow.build(builder);
        entry.defintion = builder.build(workflow.id, workflow.version);        
        wfes_registry.push(entry);
    }

}

class RegistryEntry {
    public id: string;
    public version: number;
    public defintion: WorkflowDefinition;
}