const config = require("config");
const kafka = require('kafka-node');
const elasticsearch = require("elasticsearch");
const dotenv = require('dotenv');
dotenv.config();

const esclient = new elasticsearch.Client({
    host: config.elasticsearch.server,
    user: process.env.ES_USER,
    password: process.env.ES_PASSWORD,
});

const kafkaOptions = {
	kafkaHost: config.kafka.server,
	groupId: config.kafka.group,
	autoCommit: true,
	autoCommitIntervalMs: 5000,
	sessionTimeout: 15000,
 	fetchMaxBytes: 10 * 1024 * 1024, // 10 MB
	protocol: ['roundrobin'],
	fromOffset: 'earliest',
	outOfRangeOffset: 'earliest'
}

const kafkaConsumerGroup = kafka.ConsumerGroup;
const consumer = new kafkaConsumerGroup(kafkaOptions, config.tracker.kafka_topic)

var cache = [];
var count = 0;

const esBulk = (params) => {
    return new Promise((resolve, reject) => {
        esclient.bulk(params, (err, result) => {
            if (err) return reject(err);
            return resolve(result);
        });
    })
}

const cache_size = config.consolidator.cache_size || 1000;

const flush = async () => {
    if (cache.length > cache_size) {
        try {
            consumer.pause();
            if (config.debug) {
                console.log("Cache length:", cache.length);
            }
            const result = await esBulk({ maxRetries: 5, body: cache });
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
        }
    }
}

consumer.on('message', async (message) => {
    try {
        json = JSON.parse(message.value);
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