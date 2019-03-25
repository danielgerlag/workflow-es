# Azure providers for Workflow ES

Provides distributed lock management and queue services on [Workflow ES](https://github.com/danielgerlag/workflow-es) using Azure Storage.

## Installing

Install the npm package "workflow-es-azure"

```
> npm install workflow-es-azure --save
```

## Usage

Use the .useLockManager() and .useQueueManager() methods when setting up your workflow host.

```javascript
const workflow_es = require("workflow-es");
const workflow_azure = require("workflow-es-azure");
...
var config = workflow_es.configureWorkflow();
config.useLockManager(new workflow_azure.AzureLockManager('Azure storage connection string'));   
config.useQueueManager(new workflow_azure.AzureQueueProvider('Azure storage connection string'));

var host = config.getHost();
...
await host.start();
```
