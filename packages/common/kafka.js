const kafka = require('kafka-node');
const config = require("config");

/*
KafkaProducer

Usage: 
```
const producer = new KafkaProducer({ topic: "test" });
try {
    await producer.send({ foo: "Foo", bar: "Bar" });
} catch(err) {
    console.log("There was an error sending a message to Kafka");
    console.error(err);
}
```
options:
topic   No default  Required
debug   false   Boolean
server  config.kafka.server || "localhost:9092"
partitions  config.kafka.partitions || 1
replication_factor config.kafka.replication_factor || 1
*/
class KafkaProducer {
    constructor(opts) {
        if (!opts.topic) throw "Topic required";
        this.debug = opts.debug || false;
        const Producer = kafka.Producer;
        this.server = opts.server || config.kafka.server || "localhost:9092";
        const client = new kafka.KafkaClient({
            kafkaHost: this.server,
        });
        this.producer = new Producer(client);
        this.topic = opts.topic;
        client.createTopics(
            [
                {
                    topic: this.topic,
                    partitions: opts.partitions || config.kafka.partitions || 1,
                    replicationFactor: opts.replication_factor || config.kafka.replication_factor || 1,
                },
            ],
            (err, result) => {
                if (err) {
                    throw(err);
                }
            }
        );
        if (this.debug) console.log(`Kafka Producer created for topic ${this.topic} on server ${this.server}`);
    }

    send(data) {
        return new Promise((resolve, reject) => {
            this.producer.send(
                [
                    {
                        topic: this.topic,
                        messages: JSON.stringify(data),
                    },
                ],
                (err, result_data) => {
                    if (err) return reject(err);
                    if (this.debug) {
                        console.log(`Sent Kafka data to ${this.topic}`);
                        console.log(result_data);
                    }
                    return resolve(result_data);
                }
            );
        });
    }
}

/*
KafkaConsumer
Usage:
```
const consumer = new KafkaConsumer({ topic: "test" });
consumer.on("message", message => console.log(`Message ${message} received`));
```
Options:
topic   No default  Required
debug   false   Boolean
server  config.kafka.server || "localhost:9092"
group   config.kafka.group
*/

const EventEmitter = require('events');

class KafkaConsumer extends EventEmitter {
    constructor(opts) {
        try {
            super();
            if (!opts.topic) throw "Topic required";
            this.debug = opts.debug || false;
            const kafkaOptions = Object.assign({
                kafkaHost: opts.server || config.kafka.server || "localhost:9092",
                groupId: opts.group || config.kafka.group,
                autoCommit: true,
                autoCommitIntervalMs: 5000,
                sessionTimeout: 15000,
                fetchMaxBytes: 10 * 1024 * 1024, // 10 MB
                protocol: ['roundrobin'],
                fromOffset: 'earliest',
                outOfRangeOffset: 'earliest'
            }, opts.options);
            const kafkaConsumerGroup = kafka.ConsumerGroup;
            this.consumer = new kafkaConsumerGroup(kafkaOptions, opts.topic);
            this.consumer.on("message", this.onMessage.bind(this));
            this.consumer.on("error", this.onError.bind(this));
            if (this.debug) console.log(`Kafka Consumer listening for topic ${opts.topic} in group ${kafkaOptions.groupId} on server ${kafkaOptions.kafkaHost}`);
        } catch(err) {
            if (this.debug) console.error(err);
            throw err;
        }
    }

    onMessage(message) {
        try {
            if (!message.value) return;
            const json = JSON.parse(message.value);
            this.emit("message", json);
            if (this.debug) {
                console.log("Got message")
                console.log(json);
            }
        } catch(err) {
            if (this.debug) console.error(err);
            throw err;
        }
    }

    onError(err) {
        if (this.debug) console.error(err);
        this.emit("error", err);
    }

    pause() {
        return this.consumer.pause();
    }

    resume() {
        return this.consumer.resume();
    }

    async close(force) {
        return new Promise((resolve, reject) => {
            this.consumer.close(force, (err, result) => {
                if (err) return reject(err);
                if (this.debug) console.log("Kafka consumer closed");
                return resolve(result);
            })
        })
    }
}

module.exports = { KafkaProducer, KafkaConsumer }