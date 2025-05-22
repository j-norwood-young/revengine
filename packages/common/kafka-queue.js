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
            debug: process.env.DEBUG === "true",
            options: {
                // Add some KafkaJS specific options for better reliability
                retry: {
                    initialRetryTime: 100,
                    retries: 8
                }
            }
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

                try {
                    await fn(data);
                } catch (processingError) {
                    console.error("Error in message processing function:", processingError);
                    // Emit error event for better error handling
                    this.emit('error', processingError);
                }
            } catch (error) {
                console.error("Error processing message:", error);
                if (message?.value) {
                    console.error("Message content:",
                        typeof message.value === 'object'
                            ? JSON.stringify(message.value)
                            : message.value.toString()
                    );
                }
                // Emit error event for better error handling
                this.emit('error', error);
            }
        });

        this.consumer.on("error", (error) => {
            console.error("Kafka consumer error:", error);
            this.emit('error', error);
        });
    }

    async close() {
        try {
            await this.consumer.close();
        } catch (error) {
            console.error("Error closing consumer:", error);
            throw error;
        }
    }
}

export class pub {
    constructor(topic = process.env.KAFKA_TOPIC) {
        if (!topic) {
            throw new Error("Please provide KAFKA_TOPIC in environment variables");
        }

        this.producer = new KafkaProducer({
            topic,
            debug: process.env.DEBUG === "true",
            // Add some KafkaJS specific options for better reliability
            options: {
                retry: {
                    initialRetryTime: 100,
                    retries: 8
                }
            }
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
        try {
            await this.producer.close();
        } catch (error) {
            console.error("Error closing producer:", error);
            throw error;
        }
    }

    async getMetrics() {
        // Kafka doesn't provide direct queue metrics like Redis
        // This method is kept for API compatibility
        return { waiting: 0 };
    }
} 