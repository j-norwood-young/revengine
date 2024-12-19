const config = require("config");
const { KafkaConsumer } = require("@revengine/common/kafka");
const esclient = require("@revengine/common/esclient");
const fs = require("fs");
const Cache = require("@revengine/common/cache");

const redis_cache = new Cache({
    debug: config.debug,
    prefix: "consolidator",
    ttl: 60 * 60 * 24 // 1 day
});

let consumer;
try {
    consumer = new KafkaConsumer({
        topic: config.tracker.kafka_topic,
        group: config.kafka.group || "consolidator",
        debug: config.debug
    });
} catch (err) {
    console.error(err);
    process.exit(1);
}

var cache = [];
var count = 0;

const cache_size = config.consolidator.cache_size || 1000;
let isFlushing = false;

const flush = async () => {
    if (isFlushing) return;
    if (cache.length > cache_size) {
        try {
            isFlushing = true;
            consumer.pause();
            if (config.debug) {
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
                        if (config.debug) {
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
                        if (config.debug) {
                            console.log(`Creating new record for ${mappingKey}`);
                        }
                        processedCache.push(action);
                        processedCache.push(enrichedDoc);
                    }
                } else {
                    // No browser_id or article_id, just pass through
                    if (config.debug) {
                        console.log('Processing record without browser_id or article_id');
                    }
                    processedCache.push(action);
                    processedCache.push(enrichedDoc);
                }
            }

            const result = await esclient.bulk({ body: processedCache });

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

            if (config.debug) {
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

consumer.on('message', async (messages) => {
    try {
        json = JSON.parse(messages[0].messages);
        if (config.debug) {
            console.log(JSON.stringify(json, null, "  "));
        }
        for (let index of config.consolidator.indexes[json.index]) {
            try {
                cache.push({
                    index: {
                        _index: index,
                        _type: "_doc",
                    }
                }, json);
            } catch (err) {
                console.error(err);
            }
        };
    } catch (err) {
        console.error(err);
    }
});

consumer.on("error", err => {
    console.error(err);
})

const interval = config.consolidator.test_interval || 5000;
console.log(`===${config.name} Consolidator Started===`);
if (config.debug) {
    console.log(`${config.name} Consolidator listening for kafka messages; flushing cache every ${interval / 1000}s`);
}
setInterval(flush, interval);