import { IPersistenceProvider, WorkflowInstance, ExecutionPointer } from "workflow-es";
import { MongoDBPersistence } from "../src/mongodb-provider";
var stringify = require('json-stable-stringify');

describe("mongodb-provider", () => {
    
    var persistence: IPersistenceProvider;
    var wf1: WorkflowInstance;    

    beforeAll((done) => {
        persistence = new MongoDBPersistence("mongodb://127.0.0.1:27019/tests", () => done());
    });

    describe("createNewWorkflow", () => { 
        var returnedId: string;
        
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
        var wf2: WorkflowInstance;
        beforeEach((done) => {            
            persistence.getWorkflowInstance(wf1.id)
                .then(wf => {                    
                    wf2 = wf;
                    done();
                })
                .catch(done.fail);            
        });

        it("should match the orignal", function() {
            expect(stringify(wf2)).toBe(stringify(wf1));
        });
    });

    describe("persistWorkflow", () => {
        var modified: WorkflowInstance;
        
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
                    delete data['_id']; //caveat
                    expect(stringify(data)).toBe(stringify(modified));                    
                    done();                            
                })
                .catch(done.fail);            
        });
    });

});
