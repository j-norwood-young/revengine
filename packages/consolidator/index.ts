// DEPRECATED

import config from "config";
import { KafkaConsumer } from "@revengine/common/kafka.js";
import esclient from "@revengine/common/esclient.js";
import fs from "fs";
import Cache from "@revengine/common/cache.js";
import dotenv from "dotenv";
dotenv.config();

const debug = process.env.DEBUG === "true";

const redis_cache = new Cache({
    debug: debug,
    prefix: "consolidator",
    ttl: 60 * 60 * 24 // 1 day
});

const topic = process.env.KAFKA_TOPIC || config.tracker.kafka_topic || "consolidator_events";
const group = process.env.KAFKA_GROUP || config.kafka.group || "consolidator";

console.log({ topic, group, debug });

let consumer;
try {
    consumer = new KafkaConsumer({
        topic,
        group,
        debug: debug
    });
} catch (err) {
    console.error(err);
    process.exit(1);
}

var cache = [];
var count = 0;

const cache_size = process.env.CACHE_SIZE || config.consolidator.cache_size || 1000;
let isFlushing = false;
let isRebalancing = false;
let rebalancingTimeout = null;

const flush = async () => {
    if (isFlushing) return;
    if (cache.length > cache_size) {
        try {
            isFlushing = true;
            consumer.pause();
            if (debug) {
                console.log("Cache length:", cache.length);
            }

            // Process cache to update existing documents
            const processedCache = [];
            for (let i = 0; i < cache.length; i += 2) {
                const action = cache[i];
                const doc = cache[i + 1];

                // Add time_updated to the document
                const enrichedDoc = {
                    ...doc,
                    time_updated: new Date().toISOString()
                };

                if (doc.browser_id && doc.article_id) {
                    const mappingKey = `${doc.browser_id}:${doc.article_id}`;
                    const existingId = await redis_cache.get(mappingKey);

                    if (existingId) {
                        // Update existing document
                        if (debug) {
                            console.log(`Updating existing record for ${mappingKey} (ID: ${existingId})`);
                        }
                        processedCache.push({
                            update: {
                                _index: action.index._index,
                                _type: "_doc",
                                _id: existingId
                            }
                        });
                        processedCache.push({
                            doc: enrichedDoc,
                            doc_as_upsert: true
                        });
                    } else {
                        // Create new document
                        if (debug) {
                            console.log(`Creating new record for ${mappingKey}`);
                        }
                        processedCache.push(action);
                        processedCache.push(enrichedDoc);
                    }
                } else {
                    // No browser_id or article_id, just pass through
                    if (debug) {
                        console.log('Processing record without browser_id or article_id');
                    }
                    processedCache.push(action);
                    processedCache.push(enrichedDoc);
                }
            }

            const result = await esclient.bulk({ body: processedCache });

            console.log({ result: JSON.stringify(result.items.slice(0, 3), null, "   "), size: result.items.length });

            // Update Redis cache with results
            result.items.forEach((item, index) => {
                const originalDoc = processedCache[index * 2 + 1]; // Get the original document
                if (originalDoc.browser_id && originalDoc.article_id) {
                    const mappingKey = `${originalDoc.browser_id}:${originalDoc.article_id}`;
                    const docId = item.index?._id || item.update?._id;
                    if (docId) {
                        redis_cache.set(mappingKey, docId);
                    }
                }
            });

            // Write debug files
            fs.writeFileSync("/tmp/consolidator.cache.json", JSON.stringify(processedCache, null, 2));
            cache = [];
            fs.writeFileSync("/tmp/consolidator.json", JSON.stringify(result, null, 2));

            if (debug) {
                console.log(JSON.stringify(result, null, "  "));
                console.log(`Flushed cache, loop ${count++}, items ${result.items.length}`);
                for (let item of result.items) {
                    if (item.index?.error || item.update?.error) {
                        console.error(item.index?.error || item.update?.error);
                    }
                }
            }
            consumer.resume();
        } catch (err) {
            consumer.resume();
            console.log("We hit an error");
            console.error(err);
        } finally {
            isFlushing = false;
        }
    }
}

consumer.on('message', async (message) => {
    try {
        // The message value is already parsed by our Kafka consumer

        const msg = message.value[0];
        const json = JSON.parse(msg.messages);
        if (debug) {
            console.log("Received message:", JSON.stringify(json, null, "  "));
        }

        if (!json.index) {
            if (debug) {
                console.log(`Skipping message - no valid index configuration found for index: ${json.index}`);
            }
            return;
        }

        try {
            cache.push({
                index: {
                    _index: json.index,
                    _type: "_doc",
                }
            }, json);
        } catch (err) {
            console.error("Error pushing to cache:", err);
            console.error("Message content:", JSON.stringify(json));
        }
    } catch (err) {
        console.error("Error processing message:", err);
        console.error("Raw message:", message);
    }
});

consumer.on("error", err => {
    console.error("Kafka consumer error:", err);
});

// Handle rebalancing events
consumer.on("rebalancing", (payload) => {
    console.log("Consumer group is rebalancing - pausing message processing");
    isRebalancing = true;
    consumer.pause();
    
    // Set a timeout to force resume if rebalancing takes too long
    if (rebalancingTimeout) {
        clearTimeout(rebalancingTimeout);
    }
    rebalancingTimeout = setTimeout(() => {
        if (isRebalancing) {
            console.warn("Rebalancing timeout - forcing resume after 60 seconds");
            isRebalancing = false;
            consumer.resume();
        }
    }, 60000); // 60 second timeout
});

consumer.on("rebalancingComplete", (payload) => {
    console.log("Consumer group rebalancing completed - resuming message processing");
    isRebalancing = false;
    if (rebalancingTimeout) {
        clearTimeout(rebalancingTimeout);
        rebalancingTimeout = null;
    }
    consumer.resume();
});

consumer.on("connect", (payload) => {
    console.log("Consumer connected");
    if (payload && payload.groupId) {
        console.log(`Group ID: ${payload.groupId}`);
    }
});

consumer.on("disconnect", (payload) => {
    console.log("Consumer disconnected");
    if (payload && payload.groupId) {
        console.log(`Group ID: ${payload.groupId}`);
    }
});

consumer.on("crash", (payload) => {
    console.error("Consumer crashed");
    if (payload) {
        if (payload.groupId) {
            console.error(`Group ID: ${payload.groupId}`);
        }
        if (payload.error) {
            console.error("Error:", payload.error);
        }
    }
});

const interval = process.env.TEST_INTERVAL || config.consolidator.test_interval || 5000;
console.log(`===${config.name} Consolidator Started===`);
if (debug) {
    console.log(`${config.name} Consolidator listening for kafka messages; flushing cache every ${interval / 1000}s`);
}

// Graceful shutdown handling
let isShuttingDown = false;
const gracefulShutdown = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    console.log(`Received ${signal}, starting graceful shutdown...`);
    
    try {
        // Pause consumer to stop receiving new messages
        await consumer.pause();
        console.log("Consumer paused");
        
        // Flush any remaining cache
        if (cache.length > 0) {
            console.log(`Flushing remaining ${cache.length} items in cache...`);
            await flush();
        }
        
        // Close consumer
        await consumer.close();
        console.log("Consumer closed");
        
        // Close Redis cache
        await redis_cache.close();
        console.log("Redis cache closed");
        
        console.log("Graceful shutdown completed");
        process.exit(0);
    } catch (error) {
        console.error("Error during graceful shutdown:", error);
        process.exit(1);
    }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

setInterval(flush, interval);