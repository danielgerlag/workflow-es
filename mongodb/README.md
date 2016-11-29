# MongoDB Persistence provider for Workflow ES

Provides support to persist workflows running on [Workflow ES](../README.md) to a MongoDB database.

## Installing

Install the npm package "workflow-es-mongodb"

```
> npm install workflow-es-mongodb --save
```

## Usage

Use the .usePersisence method when setting up your workflow host.

```TypeScript
var host = new WorkflowHost();
host.usePersisence(new MongoDBPersistence("mongodb://127.0.0.1:27017/workflow"));
...
host.start();
```
