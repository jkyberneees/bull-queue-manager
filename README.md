# bull-queue-manager
Minimalistic queue manager based on [bull](https://www.npmjs.com/package/bull): the awesome Node.js job and message queue.

This module provides a high level API that allow you to re-use shared configurations and instances, as well as [reduce the number of redis connections](https://github.com/OptimalBits/bull#reusing-redis-connections) to the minimum by default.
Also introduce a convenient "response" promise to easily process jobs result:
```js
let result = await q1.add({
    name: 'job1'
}).response;
```

## Usage ##
Create and initialize Queue Manager:
```js
const QueueManager = require('bull-queue-manager').QueueManager;
const qm = new QueueManager(
    6379,           //redis port
    'localhost',    //redis host
    0,              //redis db
    {}              //redis options (described in https://github.com/luin/ioredis/blob/master/API.md)
);
qm.init();
```
```js
// also redis URL can be used
const qm = new QueueManager('redis://localhost:6379/0', {
    // options
});
```
### Create some queues on demand: ###
```js
const q1 = qm.queue('q1');
const q2 = qm.queue('q2');
const q3 = qm.queue('q3');
const q4 = qm.queue('q4');

// optionally override default config
const q5 = qm.queue('q5', 6379, 'redis.instance.com', 1, {});
const q6 = qm.queue('redis://localhost:6379/3', {});
// ...
```

### Register job processors: ###

```js
q1.process(async (job) => {
    // ... do something with job.data
    // ...

    // finally respond something
    return {
        success: true
    };
});
```

### Add jobs to queues: ###
```js
let promise = q1.add({
    name: 'job1'
});
let job = await promise; // https://github.com/OptimalBits/bull#job
```

### Add jobs to queues, optionally process result from processing: ###
```js
let promise = q1.add({
    name: 'job1'
});
// you can get the response promise here
let result = await promise.response;
// result == { success: true }  
```

### Shutdown the QueueManager instance (close all queues): ###
```js
qm.shutdown();
```
