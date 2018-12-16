import { IPersistenceProvider, WorkflowInstance, ExecutionPointer, Event } from "workflow-es";
import { Sequelize } from 'sequelize-typescript';
import { MySqlPersistence } from "../src/mysql-provider";
var stringify = require('json-stable-stringify');

const MY_SQL_DATABASE = "tests";

describe("mysql-provider", () => {
    
    var persistence: IPersistenceProvider;
    var wf1: WorkflowInstance;
    var ev1: Event;
    var ev2: Event;

    beforeAll(async (done) => {

        var sequelize = new Sequelize(`mysql://root:test-password@127.0.0.1:3308/`);
        await sequelize.createSchema(MY_SQL_DATABASE, {logging: false});

        var mySqlProvider = new MySqlPersistence(`mysql://root:test-password@127.0.0.1:3308/${MY_SQL_DATABASE}`);
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

        it("should match the original", function() {
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

        it("should match the original", (done) => {
            persistence.getWorkflowInstance(modified.id)
                .then((data) => {
                    delete data["id"];
                    expect(stringify(data)).toBe(stringify(modified));
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

        it("should return a generated id", function() {
            expect(returnedId).toBeDefined();
        });

        it("should return update original object with id", function() {
            expect(ev1.id).toBeDefined();
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

        it("should return a generated id", function() {            
            expect(returnedId).toBeDefined();
        });

        it("should return update original object with id", function() {            
            expect(ev2.id).toBeDefined();
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
        
        it("should contain previous event id", function() {
          expect(returnedEvents).toContain(ev1.id);
        });
    });

    describe("markEventProcessed", () => {
        var eventResult1: Event;
          beforeEach((done) => {
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
  
          it("should be 'true'", () => {
              expect(eventResult1.isProcessed).toEqual(true);
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
        
        it("should be 'false'", () => {
            expect(eventResult2.isProcessed).toEqual(false);
        });
    });
});