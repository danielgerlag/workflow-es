import { IPersistenceProvider } from "../../src/abstractions";
import { WorkflowInstance, ExecutionPointer } from "../../src/models";
import { MemoryPersistenceProvider } from "../../src/services/memory-persistence-provider";

describe("memory-persistence-provider", () => {
    
    let persistence: IPersistenceProvider = new MemoryPersistenceProvider();
    let wf1: WorkflowInstance;    

    beforeEach(() => {        
    });

    describe("createNewWorkflow", () => { 
        let returnedId: string;
        
        beforeEach((done) => {
            wf1 = new WorkflowInstance();
            return persistence.createNewWorkflow(wf1)
                .then(id => {
                    returnedId = id;
                    done();
                })
                .catch(done.fail);            
        });

        it("should return a generated id", function() {            
            expect(returnedId).toBeDefined();
        });

        it("should return update original object with id", function() {            
            expect(wf1.id).toBeDefined();
        });
    });

    describe("getWorkflowInstance", () => {
        let wf2: WorkflowInstance;
        beforeEach((done) => {            
            persistence.getWorkflowInstance(wf1.id)
                .then(wf => {                    
                    wf2 = wf;
                    done();
                })
                .catch(done.fail);            
        });

        it("should match the orignal", function() {            
            expect(JSON.stringify(wf2)).toBe(JSON.stringify(wf1));
        });
    });

    describe("persistWorkflow", () => {
        let modified: WorkflowInstance;
        
        beforeEach((done) => {    
            modified = JSON.parse(JSON.stringify(wf1));
            modified.nextExecution = 44;
            modified.executionPointers.push(new ExecutionPointer());        
            persistence.persistWorkflow(modified)
                .then(() => done())                
                .catch(done.fail);            
        });

        it("should match the orignal", (done) => {
            persistence.getWorkflowInstance(modified.id)
                .then((data) => {
                    expect(JSON.stringify(data)).toBe(JSON.stringify(modified));
                    done();                            
                })
                .catch(done.fail);            
        });
    });

});
