const expect = require("chai").expect;
const QueueManager = require('./index').QueueManager;
let qm, q1, q2, q3, q4, q5;


describe('Bull Queue Manager', () => {

    it('creating manager instance', async() => {
        qm = new QueueManager();
        qm2 = new QueueManager();
        qm.init();
        qm2.init();
    });

    it('creating some queues', async() => {
        q1 = qm.queue('q1');
        q2 = qm.queue('q2');
        q3 = qm.queue('q3');
        q4 = qm.queue('q4');
        q5 = qm.queue('q5');
    });

    it('processing jobs', (done) => {
        qm2.queue('q1').process(async(job) => {
            expect(job.data.name).to.equal('job1');

            return {
                success: true
            };
        });

        q1.add({
            name: 'job1'
        }).response.then(result => {
            expect(result.success).to.equal(true)
            done();
        });
    });

    it('shutdown', (done) => {
        qm.shutdown();
        done();
    });
});