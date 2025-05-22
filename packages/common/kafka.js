const { Kafka } = require('kafkajs');
const config = require("config");
const dotenv = require('dotenv');
dotenv.config();

const kafka_server = process.env.KAFKA_SERVER || config.kafka.server || "localhost:9092";
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
*/

class KafkaProducer {
    /**
     * Constructs a Kafka producer instance.
     * @param {Object} opts - The options for the Kafka producer.
     * @param {string} opts.server - The Kafka server address. If not provided, it will use the default server address from the configuration.
     * @param {string} opts.topic - The topic to produce messages to.
     * @param {boolean} [opts.debug=false] - Whether to enable debug mode.
     * @param {number} [opts.partitions] - The number of partitions for the topic. If not provided, it will use the default number of partitions from the configuration.
     * @param {number} [opts.replication_factor] - The replication factor for the topic. If not provided, it will use the default replication factor from the configuration.
     */
    constructor(opts) {
        if (!opts.topic) throw "Topic required";
        this.debug = opts.debug || false;
        this.server = opts.server || kafka_server;
        this.topic = opts.topic;

        const kafka = new Kafka({
            brokers: [this.server],
            retry: {
                initialRetryTime: 100,
                retries: 8
            }
        });

        this.producer = kafka.producer();
        this.admin = kafka.admin();

        // Initialize producer and create topic if needed
        this.init(opts);
    }

    async init(opts) {
        try {
            await this.producer.connect();
            await this.admin.connect();

            // Check if topic exists and create if it doesn't
            const topics = await this.admin.listTopics();
            if (!topics.includes(this.topic)) {
                if (this.debug) {
                    console.log(`Creating topic ${this.topic}`);
                }
                await this.admin.createTopics({
                    topics: [{
                        topic: this.topic,
                        numPartitions: process.env.PARTITIONS || opts.partitions || config.kafka.partitions || 10,
                        replicationFactor: opts.replication_factor || config.kafka.replication_factor || 1
                    }]
                });
            }

            if (this.debug) {
                console.log(`Kafka Producer created for topic ${this.topic} on server ${this.server}`);
            }
        } catch (error) {
            console.error('Error initializing producer:', error);
            throw error;
        }
    }

    /**
     * Sends data to Kafka topic.
     * @param {Object} data - The data to be sent.
     * @returns {Promise} A promise that resolves with the result data if successful, or rejects with an error if unsuccessful.
     */
    async send(data) {
        try {
            const message = typeof data === 'string' ? data : JSON.stringify(data);
            const result = await this.producer.send({
                topic: this.topic,
                messages: [{ value: message }]
            });

            if (this.debug) {
                console.log(`Sent Kafka data to ${this.topic}`);
            }
            return result;
        } catch (error) {
            console.error("Error in KafkaProducer.send:", error);
            throw error;
        }
    }

    /**
     * Closes the Kafka producer.
     * @returns {Promise<void>}
     */
    async close() {
        try {
            await this.producer.disconnect();
            await this.admin.disconnect();
            if (this.debug) console.log("Kafka producer closed");
        } catch (error) {
            console.error("Error closing producer:", error);
            throw error;
        }
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
server  process.env.KAFKA_SERVER || config.kafka.server || "localhost:9092"
group   config.kafka.group
*/

const EventEmitter = require('events');

class KafkaConsumer extends EventEmitter {
    /**
     * Creates a new instance of the Kafka consumer.
     * @param {Object} opts - The options for the Kafka consumer.
     * @param {string} opts.server - The Kafka server address. If not provided, it will use the default server address from the configuration.
     * @param {string} opts.topic - The topic to consume messages from.
     * @param {boolean} [opts.debug=false] - Whether to enable debug mode.
     * @param {string} opts.group - The consumer group ID.
     * @param {Object} opts.options - Additional options for the Kafka consumer.
     * @throws {string} Throws an error if the topic or group is not provided.
     */
    constructor(opts) {
        try {
            super();
            if (!opts.topic) throw "Topic required";
            if (!opts.group) throw "Group required";
            this.debug = opts.debug || false;

            const kafka = new Kafka({
                brokers: [opts.server || kafka_server],
                retry: {
                    initialRetryTime: 100,
                    retries: 8
                }
            });

            this.consumer = kafka.consumer({
                groupId: opts.group || config.kafka.group,
                sessionTimeout: 15000,
                maxBytes: 10 * 1024 * 1024, // 10 MB
                ...opts.options
            });

            this.topic = opts.topic;
            this.init();

            if (this.debug) {
                console.log(`Kafka Consumer listening for topic ${opts.topic} in group ${opts.group} on server ${opts.server || kafka_server}`);
            }
        } catch (err) {
            if (this.debug) console.error(err);
            throw err;
        }
    }

    async init() {
        try {
            await this.consumer.connect();
            await this.consumer.subscribe({
                topic: this.topic,
                fromBeginning: true
            });

            await this.consumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    try {
                        this.onMessage({
                            topic,
                            partition,
                            offset: message.offset,
                            value: message.value,
                            key: message.key
                        });
                    } catch (error) {
                        this.onError(error);
                    }
                }
            });
        } catch (error) {
            this.onError(error);
        }
    }

    /**
     * Handles the incoming message from Kafka.
     * @param {object} message - The Kafka message.
     * @returns {void}
     */
    onMessage(message) {
        try {
            if (!message || !message.value) {
                if (this.debug) console.log("Received empty message");
                return;
            }

            let parsedMessage;
            const messageValue = message.value.toString();

            try {
                // Only try to parse if it looks like a JSON string
                if (messageValue.startsWith('{') || messageValue.startsWith('[')) {
                    parsedMessage = JSON.parse(messageValue);
                } else {
                    parsedMessage = messageValue;
                }
            } catch (error) {
                if (this.debug) {
                    console.error("Failed to parse message in Kafka consumer:", error);
                    console.error("Raw message:", messageValue);
                }
                parsedMessage = messageValue;
            }

            this.emit("message", { ...message, value: parsedMessage });

            if (this.debug) {
                console.log("Got message");
                console.log(parsedMessage);
            }
        } catch (err) {
            if (this.debug) {
                console.error("Error in KafkaConsumer.onMessage:", err);
            }
            this.emit("error", err);
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
     * @returns {Promise<void>}
     */
    async pause() {
        await this.consumer.pause([{ topic: this.topic }]);
    }

    /**
     * Resumes the Kafka consumer.
     * @returns {Promise<void>}
     */
    async resume() {
        await this.consumer.resume([{ topic: this.topic }]);
    }

    /**
     * Closes the Kafka consumer.
     * @returns {Promise<void>}
     */
    async close() {
        try {
            await this.consumer.stop();
            await this.consumer.disconnect();
            if (this.debug) console.log("Kafka consumer closed");
        } catch (error) {
            console.error("Error closing consumer:", error);
            throw error;
        }
    }
}

module.exports = { KafkaProducer, KafkaConsumer }