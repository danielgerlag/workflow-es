import { IPersistenceProvider, WorkflowInstance, ExecutionPointer, Event } from "workflow-es";
import { MySqlPersistence } from "../src/mysql-provider";
import { getConnectionString, createTestSchema } from "./helpers/config";
var stringify = require('json-stable-stringify');

describe("mysql-provider", async () => {
    
    var persistence: IPersistenceProvider;
    var wf1: WorkflowInstance;
    var ev1: Event;
    var ev2: Event;

    beforeAll(async (done) => {
        await createTestSchema();

        var mySqlProvider = new MySqlPersistence(getConnectionString());
        mySqlProvider.connect.then(() => {

            persistence = mySqlProvider;

            done();
        });
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

        it("should return a generated id", function(done) {
            expect(returnedId).toBeDefined();
            done();
        });

        it("should return update original object with id", function(done) {
            expect(wf1.id).toBeDefined();
            done();
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

        it("should match the original", function(done) {
            expect(stringify(wf2.id)).toBe(stringify(wf1.id));
            done();
        });
    });

    describe("persistWorkflow", () => {
        var modified: WorkflowInstance;

        beforeEach((done) => {
            modified = wf1;
            modified.nextExecution = 44;
            modified.executionPointers.push(new ExecutionPointer());
            persistence.persistWorkflow(modified)
                .then(() => done())
                .catch(done.fail);
        });

        it("should match the original", (done) => {
            persistence.getWorkflowInstance(modified.id)
                .then((data) => {
                    delete data.id;
                    expect(stringify(data.nextExecution)).toBe(stringify(modified.nextExecution));
                    expect(stringify(data.executionPointers)).toBe(stringify(modified.executionPointers));
                    done();
                })
                .catch(done.fail);
        });
    });

    describe("createEvent isProcessed:false", () => {
        var returnedId: string;

        beforeEach((done) => {
            ev1 = new Event();
            ev1.eventName = 'test-event';
            ev1.eventKey = "1";
            ev1.eventData = null;
            ev1.eventTime = new Date();
            ev1.isProcessed = false;
            return persistence.createEvent(ev1)
                .then(id => {
                    returnedId = id;
                    done();
                })
                .catch(done.fail);
        });

        it("should return a generated id", function(done) {
            expect(returnedId).toBeDefined();
            done();
        });

        it("should return update original object with id", function(done) {
            expect(ev1.id).toBeDefined();
            done();
        });
    });

    describe("createEvent isProcessed:true", () => { 
        var returnedId: string;
        
        beforeEach((done) => {
            ev2 = new Event();
            ev2.eventName = 'test-event';
            ev2.eventKey = "1";
            ev2.eventData = null;
            ev2.eventTime = new Date();
            ev2.isProcessed = true;
            return persistence.createEvent(ev2)
                .then(id => {
                    returnedId = id;
                    done();
                })
                .catch(done.fail);            
        });

        it("should return a generated id", function(done) {            
            expect(returnedId).toBeDefined();
            done();
        });

        it("should return update original object with id", function(done) {            
            expect(ev2.id).toBeDefined();
            done();
        });
    });

    describe("getRunnableEvents", () => {
        var returnedEvents: Array<string>;
        
        beforeEach((done) => {
          return persistence.getRunnableEvents()
              .then( events => {
                returnedEvents = events;
                done();
              })
              .catch(done.fail);
        });
        
        it("should contain previous event id", function(done) {
          expect(returnedEvents).toContain(ev1.id);
          done();
        });
    });

    describe("markEventProcessed", () => {
        var eventResult1: Event;
          beforeEach((done) => {
            persistence.createEvent(ev1)
              .then(eventId => {
                  ev1.id = eventId;
              });
              return persistence.markEventProcessed(ev1.id)
                  .then(() => {
                    persistence.getEvent(ev1.id)
                      .then((event) => {
                        eventResult1 = event;
                        done();
                      })
                  })
                  .catch(done.fail);
          });
  
          it("should be 'true'", (done) => {
              expect(eventResult1.isProcessed).toEqual(true);
              done();
          });
      });

      describe("markEventUnprocessed", () => {
        var eventResult2: Event;
        beforeEach((done) => {
            return persistence.markEventUnprocessed(ev2.id)
                .then(() => {
                  persistence.getEvent(ev2.id)
                    .then((event) => {
                      eventResult2 = event;
                      done();
                    })
                })
                .catch(done.fail);
        });
        
        it("should be 'false'", (done) => {
            expect(eventResult2.isProcessed).toEqual(false);
            done();
        });
    });
});