import { Kafka } from 'kafkajs';
import config from "config";
import dotenv from 'dotenv';
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
            },
            logLevel: this.debug ? 4 : 1 // 1 = ERROR, 4 = DEBUG
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

import { EventEmitter } from 'events';

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
                },
                logLevel: opts.debug ? 4 : 1 // 1 = ERROR, 4 = DEBUG
            });

            this.consumer = kafka.consumer({
                groupId: opts.group || config.kafka.group,
                sessionTimeout: 30000, // 30s session timeout
                heartbeatInterval: 3000, // Send heartbeat every 3s
                maxBytes: 10 * 1024 * 1024, // 10 MB
                maxWaitTimeInMs: 5000, // Wait up to 5s for messages
                maxPollIntervalMs: 300000, // 5 minutes max processing time
                allowAutoTopicCreation: true, // Allow topic creation if it doesn't exist
                ...opts.options
            });

            this.topic = opts.topic;
            this.server = opts.server || kafka_server;
            
            // Add option to reset consumer group on startup
            if (process.env.RESET_CONSUMER_GROUP === 'true') {
                console.log("🔄 Resetting consumer group on startup...");
                setTimeout(() => this.resetConsumerGroup(), 2000);
            }
            
            this.init();

            if (this.debug) {
                console.log(`Kafka Consumer listening for topic ${opts.topic} in group ${opts.group} on server ${opts.server || kafka_server}`);
                console.log(`Consumer configuration: sessionTimeout=${this.consumer.sessionTimeout}ms, heartbeatInterval=${this.consumer.heartbeatInterval}ms`);
            }
        } catch (err) {
            if (this.debug) console.error(err);
            throw err;
        }
    }

    async ensureTopicExists() {
        try {
            // Create a separate admin client using the same broker configuration
            const kafka = new Kafka({
                brokers: [this.server || kafka_server],
                retry: {
                    initialRetryTime: 100,
                    retries: 8
                },
                logLevel: this.debug ? 4 : 1
            });
            const admin = kafka.admin();
            await admin.connect();
            
            const topics = await admin.listTopics();
            const topicExists = topics.includes(this.topic);
            
            if (topicExists) {
                // Check current partition count
                const metadata = await admin.fetchTopicMetadata({ topics: [this.topic] });
                const currentPartitions = metadata.topics[0]?.partitions?.length || 0;
                const expectedPartitions = process.env.PARTITIONS || config.kafka.partitions || 10;
                
                if (currentPartitions !== expectedPartitions) {
                    console.log(`⚠️  WARNING: Topic ${this.topic} has ${currentPartitions} partitions, expected ${expectedPartitions}`);
                    console.log(`⚠️  RECREATING TOPIC WILL DELETE ALL EXISTING MESSAGES!`);
                    console.log(`⚠️  Consider using a new topic name or migrating data first.`);
                    
                    // Only recreate if explicitly allowed via environment variable
                    if (process.env.FORCE_RECREATE_TOPIC === 'true') {
                        console.log(`🔄 Force recreating topic (FORCE_RECREATE_TOPIC=true)...`);
                        
                        // Delete and recreate topic
                        await admin.deleteTopics({ topics: [this.topic] });
                        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for deletion
                        
                        await admin.createTopics({
                            topics: [{
                                topic: this.topic,
                                numPartitions: expectedPartitions,
                                replicationFactor: config.kafka.replication_factor || 1
                            }]
                        });
                        console.log(`✅ Topic ${this.topic} recreated with ${expectedPartitions} partitions`);
                    } else {
                        console.log(`❌ Topic not recreated. Set FORCE_RECREATE_TOPIC=true to force recreation (WILL DELETE DATA)`);
                        console.log(`💡 Alternative: Use a new topic name or migrate data manually`);
                    }
                } else {
                    console.log(`✅ Topic ${this.topic} already has ${expectedPartitions} partitions`);
                }
            } else {
                // Create topic if it doesn't exist
                const expectedPartitions = process.env.PARTITIONS || config.kafka.partitions || 10;
                await admin.createTopics({
                    topics: [{
                        topic: this.topic,
                        numPartitions: expectedPartitions,
                        replicationFactor: config.kafka.replication_factor || 1
                    }]
                });
                console.log(`✅ Topic ${this.topic} created with ${expectedPartitions} partitions`);
            }
            
            await admin.disconnect();
        } catch (error) {
            console.error('Error ensuring topic exists:', error);
            // Don't throw - let the consumer continue
        }
    }

    async debugTopicMetadata() {
        try {
            const kafka = new Kafka({
                brokers: [this.server || kafka_server],
                retry: { initialRetryTime: 100, retries: 8 },
                logLevel: this.debug ? 4 : 1
            });
            const admin = kafka.admin();
            await admin.connect();
            
            // Get topic metadata
            const metadata = await admin.fetchTopicMetadata({ topics: [this.topic] });
            const topicMetadata = metadata.topics[0];
            
            console.log(`🔍 Topic ${this.topic} metadata:`, {
                partitions: topicMetadata?.partitions?.length || 0,
                partitionDetails: topicMetadata?.partitions?.map(p => ({
                    partitionId: p.partitionId,
                    leader: p.leader,
                    replicas: p.replicas?.length || 0
                })) || []
            });
            
            // Get consumer group details
            const groupDetails = await admin.describeGroups({ groupIds: [this.consumer.groupId] });
            const group = groupDetails.groups[0];
            
            console.log(`🔍 Consumer group ${this.consumer.groupId} details:`, {
                state: group.state,
                members: group.members?.length || 0,
                memberDetails: group.members?.map(m => ({
                    memberId: m.memberId,
                    clientId: m.clientId,
                    assignment: Object.keys(m.memberAssignment || {}).length
                })) || []
            });
            
            await admin.disconnect();
        } catch (error) {
            console.error("Error debugging topic metadata:", error);
        }
    }

    async init() {
        try {
            await this.consumer.connect();
            
            // Check if topic exists and recreate if needed
            await this.ensureTopicExists();
            
            await this.consumer.subscribe({
                topic: this.topic,
                fromBeginning: true
            });

            // Add rebalancing event handlers
            this.consumer.on(this.consumer.events.REBALANCING, (event) => {
                console.log("Consumer rebalancing");
                if (event && event.payload) {
                    console.log("Rebalancing payload:", event.payload);
                }
                this.emit('rebalancing', event?.payload);
            });

            // Handle rebalancing completion
            this.consumer.on(this.consumer.events.GROUP_JOIN, (event) => {
                console.log("Consumer group rebalancing completed");
                if (event && event.payload) {
                    console.log("Group join payload:", event.payload);
                    if (event.payload.memberAssignment) {
                        const partitions = Object.keys(event.payload.memberAssignment).length;
                        console.log(`This consumer is assigned to ${partitions} partition(s)`);
                        
                        // Debug: Show detailed assignment info
                        if (partitions === 0) {
                            console.log("🔍 DEBUG: Consumer got 0 partitions. Checking topic metadata...");
                            this.debugTopicMetadata();
                        } else {
                            console.log(`✅ Consumer assigned to partitions:`, Object.keys(event.payload.memberAssignment));
                        }
                    }
                }
                this.emit('rebalancingComplete', event?.payload);
            });

            this.consumer.on(this.consumer.events.CONNECT, (event) => {
                console.log("Consumer connected");
                if (event && event.payload) {
                    console.log("Connect payload:", event.payload);
                }
                this.emit('connect', event?.payload);
            });

            this.consumer.on(this.consumer.events.DISCONNECT, (event) => {
                console.log("Consumer disconnected");
                if (event && event.payload) {
                    console.log("Disconnect payload:", event.payload);
                }
                this.emit('disconnect', event?.payload);
            });

            this.consumer.on(this.consumer.events.CRASH, (event) => {
                console.log("Consumer crashed");
                if (event && event.payload) {
                    console.log("Crash payload:", event.payload);
                }
                this.emit('crash', event?.payload);
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
     * Resets the consumer group to force rebalancing
     * @returns {Promise<void>}
     */
    async resetConsumerGroup() {
        try {
            // Create a separate admin client using the same broker configuration
            const kafka = new Kafka({
                brokers: [this.server || kafka_server],
                retry: {
                    initialRetryTime: 100,
                    retries: 8
                },
                logLevel: this.debug ? 4 : 1
            });
            const admin = kafka.admin();
            await admin.connect();
            
            const groupId = this.consumer.groupId;
            console.log(`Resetting consumer group: ${groupId}`);
            
            // Delete the consumer group
            await admin.deleteGroups({ groupIds: [groupId] });
            console.log(`Consumer group ${groupId} reset successfully`);
            
            await admin.disconnect();
        } catch (error) {
            console.error("Error resetting consumer group:", error);
            throw error;
        }
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

export { KafkaProducer, KafkaConsumer }