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

module.exports = {
    QueueManager: class {
        constructor(port = 6379, host = 'localhost', db = 0, opts = {}) {
            this.config = {
                port,
                host,
                opts: Object.assign({
                    db: db
                }, opts)
            };

            this.queues = {};
        }

        init() {
            this.client = new Redis(this.config.port, this.config.host, this.config.opts);
            this.subscriber = new Redis(this.config.port, this.config.host, this.config.opts);

            this.createClient = function (type) {
                switch (type) {
                    case 'client':
                        return this.client;
                    case 'subscriber':
                        return this.subscriber;
                    default:
                        return new Redis(this.config.port, this.config.host, this.config.opts);
                }
            }

            return this;
        }

        queue(name, port = 6379, host = 'localhost', db = 0, opts = {}) {
            let q = this.queues[name];
            if (!q) {
                if (Object.keys(arguments).length == 1) {
                    q = new Queue(name, this.config.port, this.config.host, Object.assign({
                        db,
                        createClient: (type) => this.createClient(type)
                    }, opts));
                } else {
                    q = new Queue(name, port, host, Object.assign({
                        db
                    }, opts));
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