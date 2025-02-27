import * as dotenv from "dotenv";
import { KafkaProducer, KafkaConsumer } from "./kafka";
import { EventEmitter } from "events";

dotenv.config();

export class sub extends EventEmitter {
    constructor(fn, topic = process.env.KAFKA_TOPIC, group = process.env.KAFKA_GROUP) {
        super();
        console.log("Initializing Kafka subscriber with:", { topic, group });
        if (!topic || !group) {
            throw new Error("Please provide KAFKA_TOPIC and KAFKA_GROUP in environment variables");
        }

        this.consumer = new KafkaConsumer({
            topic,
            group,
            debug: process.env.DEBUG === "true"
        });

        this.consumer.on("message", async (message) => {
            try {
                if (!message || !message.value) {
                    console.warn("Received empty message or message without value");
                    return;
                }

                let data = message.value;

                // If value is already an object, use it directly
                if (typeof data === 'object' && data !== null) {
                    // Clone the object to avoid modifying the original
                    data = { ...data };
                } else if (typeof data === 'string') {
                    try {
                        data = JSON.parse(data);
                    } catch (parseError) {
                        console.error("Failed to parse message:", data);
                        console.error("Parse error:", parseError);
                        return;
                    }
                } else {
                    console.warn("Unexpected message value type:", typeof data);
                    return;
                }

                if (!data || typeof data !== 'object') {
                    console.warn("Message data is not an object:", data);
                    return;
                }

                // Only set jobName if it doesn't exist
                if (!data.jobName) {
                    data.jobName = "default";
                }

                await fn(data);
            } catch (error) {
                console.error("Error processing message:", error);
                if (message?.value) {
                    console.error("Message content:",
                        typeof message.value === 'object'
                            ? JSON.stringify(message.value)
                            : message.value.toString()
                    );
                }
            }
        });
    }

    async close() {
        await this.consumer.close();
    }
}

export class pub {
    constructor(topic = process.env.KAFKA_TOPIC) {
        if (!topic) {
            throw new Error("Please provide KAFKA_TOPIC in environment variables");
        }

        this.producer = new KafkaProducer({
            topic,
            debug: process.env.DEBUG === "true"
        });
    }

    async addJob(jobName, data) {
        if (!data) {
            console.warn("Attempting to send empty data");
            return;
        }

        const message = {
            ...data,
            jobName
        };

        try {
            await this.producer.send(message);
        } catch (error) {
            console.error("Error sending message:", error);
            console.error("Message content:", JSON.stringify(message));
            throw error;
        }
    }

    async clearJob(jobName) {
        // Kafka doesn't support removing specific messages
        // This method is kept for API compatibility
        console.warn("clearJob is not supported in Kafka implementation");
    }

    async close() {
        await this.producer.close();
    }

    async getMetrics() {
        // Kafka doesn't provide direct queue metrics like Redis
        // This method is kept for API compatibility
        return { waiting: 0 };
    }
} 