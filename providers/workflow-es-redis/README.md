# Redis providers for Workflow ES

Provides distributed lock management and queue services on [Workflow ES](https://github.com/danielgerlag/workflow-es) using Redis.

## Installing

Install the npm package "workflow-es-redis"

```
> npm install workflow-es-redis --save
```

## Usage

Use the .useLockManager() and .useQueueManager() methods when setting up your workflow host.

```javascript
const workflow_redis = require("workflow-es-redis");
const Redis = require('ioredis');
...

let connection = new Redis('redis://:authpassword@127.0.0.1:6380/4');

var config = workflow_es.configureWorkflow();
config.useLockManager(new workflow_redis.RedisLockManager(connection));
config.useQueueManager(new workflow_redis.RedisQueueProvider(connection));

```
