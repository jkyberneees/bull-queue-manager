const Redis = require('ioredis');
const Queue = require('bull');
const UUID = require('uuid');
const Job = require('bull/lib/job');

const JobResponses = {};

Queue.prototype.add = function (data, opts) {
    let jobId = UUID.v4();
    let job = Job.create(this, data, Object.assign({
        jobId
    }, opts));
    job.response = new Promise((resolve, reject) => {
        JobResponses[jobId] = {
            resolve,
            reject
        };
    });

    return job;
};

const connect = (config) => {
    if ('string' == typeof config.port) return new Redis(config.port, config.opts);
    return new Redis(config.port, config.host, config.opts);
}

const queue = (name, port, host, opts) => {
    if ('string' == typeof port) {
        return new Queue(name, port, opts)
    }
    return new Queue(name, port, host, opts);
}

module.exports = {
    QueueManager: class {
        constructor(port = 6379, host = 'localhost', db = 0, opts = {}) {
            this.config = {
                port,
                host,
                opts: Object.assign({
                    db: db
                }, opts, host instanceof Object ? host : {})
            };

            this.queues = {};
        }

        init() {
            this.client = connect(this.config);
            this.subscriber = connect(this.config);

            this.createClient = function (type) {
                switch (type) {
                    case 'client':
                        return this.client;
                    case 'subscriber':
                        return this.subscriber;
                    default:
                        return connect(this.config);
                }
            }

            return this;
        }

        queue(name, port = 6379, host = 'localhost', db = 0, opts = {}) {
            let q = this.queues[name];
            if (!q) {
                if (Object.keys(arguments).length == 1) {
                    q = queue(name, this.config.port, this.config.host, Object.assign({
                        db,
                        createClient: (type) => this.createClient(type)
                    }, this.config.opts));
                } else {
                    q = queue(name, port, host, Object.assign({
                        db
                    }, opts, host instanceof Object ? host : {}));
                }
                this.queues[name] = q;

                q.on('global:completed', function (job, result) {
                    if (JobResponses[job.jobId]) {
                        JobResponses[job.jobId].resolve(result);
                    }
                    delete JobResponses[job.jobId];
                });
                q.on('global:failed', function (job, err) {
                    if (JobResponses[job.jobId]) {
                        JobResponses[job.jobId].reject(err);
                    }
                    delete JobResponses[job.jobId];
                });
            }

            return q;
        }

        shutdown() {
            for (let q of Object.values(this.queues)) {
                q.close();
            }

            this.client.quit();
            this.subscriber.quit();
        }
    }
}