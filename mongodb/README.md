# MongoDB Persistence provider for Workflow ES

Provides support to persist workflows running on [Workflow ES](../README.md) to a MongoDB database.

## Installing

Install the npm package "workflow-es-mongodb"

```
> npm install workflow-es-mongodb --save
```

## Usage

Use the .usePersistence() method when setting up your workflow host.

```javascript
const workflow_es = require("workflow-es");
const workflow_mongo = require("workflow-es-mongodb");
...
var config = workflow_es.configure();
let mongoPersistence = new workflow_mongo.MongoDBPersistence("mongodb://127.0.0.1:27017/workflow-node");
await mongoPersistence.connect;    
config.usePersistence(mongoPersistence);
var host = config.getHost();
...
await host.start();
```
