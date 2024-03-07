const config = require("config");
const { KafkaConsumer } = require("@revengine/common/kafka");
const esclient = require("@revengine/common/esclient");

let consumer;
try {
    consumer = new KafkaConsumer({
        topic: config.tracker.kafka_topic,
        group: config.kafka.group || "consolidator",
        debug: config.debug
    });
} catch(err) {
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
            const result = await esclient.bulk({ body: cache });
            cache = [];
            if (config.debug) {
                console.log(JSON.stringify(result, null, "  "));
                console.log(`Flushed cache, loop ${count++}, items ${result.items.length}`);
                for (let item of result.items) {
                    if (item.index.error) {
                        console.error(item.index.error);
                    }
                }
            }
            consumer.resume();    
        } catch(err) {
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
        json = JSON.parse(messages[0].messages); // This isn't how this is meant to work
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
            } catch(err) {
                console.error(err);
            }
        };
    } catch(err) {
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