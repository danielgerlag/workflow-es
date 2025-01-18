# Workflow ES 

[![Build Status](https://travis-ci.org/danielgerlag/workflow-es.svg?branch=master)](https://travis-ci.org/danielgerlag/workflow-es)
[<img src="https://api.gitsponsors.com/api/badge/img?id=75115688" height="20">](https://api.gitsponsors.com/api/badge/link?p=43UGDZthfFH6fEyeUeWV33kja27JHEQ3YCvS26hEMkRuU1/ZTecXDyX+feX5aszX2LHJ7YyaJuMAaW5NrkgUtA==)

Workflow ES is a workflow / saga library for Node.js (or modern browsers).  It supports pluggable persistence and concurrency providers to allow for multi-node clusters.

## Installing

Install the core npm package "workflow-es"

```
npm install workflow-es --save
```


### Guides

* [Javascript (ES6)](es2017-guide.md)
* [Typescript](typescript-guide.md)


### Persistence

Since workflows are typically long running processes, they will need to be persisted to storage between steps.
There are several persistence providers available as seperate npm packages.

* Memory Persistence Provider *(Default provider, for demo and testing purposes)*
* [MongoDB](https://github.com/danielgerlag/workflow-es/tree/master/providers/workflow-es-mongodb)
* *(more to come soon...)*

### Multi-node clusters

By default, the WorkflowHost service will run as a single node using the built-in queue and locking providers for a single node configuration.  Should you wish to run a multi-node cluster, you will need to configure an external queueing mechanism and a distributed lock manager to co-ordinate the cluster.  These are the providers that are currently available.

#### Queue Providers

* SingleNodeQueueProvider *(Default built-in provider)*
* [Azure](https://github.com/danielgerlag/workflow-es/tree/master/providers/workflow-es-azure)
* [Redis](https://github.com/danielgerlag/workflow-es/tree/master/providers/workflow-es-redis)


#### Distributed lock managers

* SingleNodeLockProvider *(Default built-in provider)*
* [Azure](https://github.com/danielgerlag/workflow-es/tree/master/providers/workflow-es-azure)
* [Redis Redlock](https://github.com/danielgerlag/workflow-es/tree/master/providers/workflow-es-redis)


## Authors

* **Daniel Gerlag** - *Initial work*


## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details


