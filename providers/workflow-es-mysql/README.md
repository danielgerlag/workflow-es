# MySQL Persistence provider for Workflow ES

Provides support to persist workflows running on [Workflow ES](https://github.com/danielgerlag/workflow-es) to a MySQL database.

## Installing

Install the npm package "workflow-es-mysql"

```
> npm install workflow-es-mysql --save
```

## Usage

Use the .usePersistence() method when setting up your workflow host.

> Make sure you have a MySQL server running and a schema to be used by workflow-es

```javascript
const workflow_es = require("workflow-es");
const workflow_mysql = require("workflow-es-mysql");
...
var config = workflow_es.configureWorkflow();
let mySqlPersistence = new workflow_mysql.MySqlPersistence("mysql://root:password@localhost:port/workflow-node");
await mySqlPersistence.connect;
config.usePersistence(mySqlPersistence);
var host = config.getHost();
...
await host.start();
```
