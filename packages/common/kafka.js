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
    /**
     * Constructs a Kafka producer instance.
     * @param {Object} opts - The options for the Kafka producer.
     * @param {string} opts.topic - The topic to produce messages to.
     * @param {boolean} [opts.debug=false] - Whether to enable debug mode.
     * @param {string} [opts.server] - The Kafka server address. If not provided, it will use the default server address from the configuration.
     * @param {number} [opts.partitions] - The number of partitions for the topic. If not provided, it will use the default number of partitions from the configuration.
     * @param {number} [opts.replication_factor] - The replication factor for the topic. If not provided, it will use the default replication factor from the configuration.
     */
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
        // Check if topic exists
        const topics = client.topicMetadata;
        if (topics[this.topic]) {
            if (this.debug) {
                console.log(`Topic ${this.topic} already exists`);
            }
            return;
        }
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

    /**
     * Sends data to Kafka topic.
     * @param {Object} data - The data to be sent.
     * @returns {Promise} A promise that resolves with the result data if successful, or rejects with an error if unsuccessful.
     */
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
                        // console.log(result_data);
                    }
                    return resolve(result_data);
                }
            );
        });
    }

    /**
     * Closes the Kafka producer.
     * @returns {Promise<any>} A promise that resolves when the producer is closed.
     */
    async close() {
        return new Promise((resolve, reject) => {
            this.producer.close((err, result) => {
                if (err) return reject(err);
                if (this.debug) console.log("Kafka producer closed");
                return resolve(result);
            })
        })
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
    /**
     * Creates a new instance of the Kafka consumer.
     * @param {Object} opts - The options for the Kafka consumer.
     * @param {string} opts.topic - The topic to consume messages from.
     * @param {boolean} [opts.debug=false] - Whether to enable debug mode.
     * @param {string} [opts.server="localhost:9092"] - The Kafka server to connect to.
     * @param {string} [opts.group] - The consumer group ID.
     * @param {Object} [opts.options] - Additional options for the Kafka consumer.
     * @throws {string} Throws an error if the topic is not provided.
     */
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

    /**
     * Handles the incoming message from Kafka.
     * @param {object} message - The Kafka message.
     * @returns {void}
     */
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

    /**
     * Handles the error event.
     * @param {Error} err - The error object.
     * @returns {void}
     */
    onError(err) {
        if (this.debug) console.error(err);
        this.emit("error", err);
    }

    /**
     * Pauses the Kafka consumer.
     * @returns {void}
     */
    pause() {
        return this.consumer.pause();
    }

    /**
     * Resumes the Kafka consumer.
     * @returns {void}
     */
    resume() {
        return this.consumer.resume();
    }

    /**
     * Closes the Kafka consumer.
     * @param {boolean} force - Whether to force close the consumer.
     * @returns {Promise<any>} A promise that resolves when the consumer is closed.
     */
    async close(force = false) {
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