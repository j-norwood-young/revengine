// Process for all hits
// 1. Get hit
// 1.1 Check cache and skip to 3 if hit is in cache
// 2. Get user segments and labels
// 3. Respond to HTTP request with ok, user segments and labels
// 4. Send to kafka queue_1 (topic-1)
// 5. Listen to kafka queue_1 (topic-1)
// 6. Get a message through queue_1
// 7. Parse user agent
// 8. Get geolocation for user
// 9. Parse referrer
// 10. Parse utm params
// 11. Get post data
// 12. Sent to kafka queue_2 (topic-2)
// 13. Listen to kafka queue_2 (topic-2)
// 14. Get a message through queue_2 (topic-2)
// 15. Save to ElasticSearch

import { KafkaConsumer } from "@revengine/common/kafka";
const config = require("config");
const http = require("http");
const KafkaProducer = require("@revengine/common/kafka").KafkaProducer;
const { enrich_tracker } = require("./enrich_tracker");
const get_user_data = require("./user").get_user_data;
const qs = require("qs");
const cookie = require("cookie");
const Redis = require("redis");
const redis = Redis.createClient();
const myCrypto = require("crypto");

const tracker_name = process.env.TRACKER_NAME || config.name || "revengine";
const port = process.env.PORT || config.tracker.port || 3012;
const kafka_server = process.env.KAFKA_SERVER || config.kafka.server || "localhost:9092";
const host = process.env.TRACKER_HOST || config.tracker.host || "127.0.0.1";
const topic = process.env.TRACKER_KAFKA_TOPIC || config.tracker.kafka_topic || `${tracker_name}_events`;
const kafka_partitions = process.env.KAFKA_PARTITIONS || config.kafka.partitions || 1;
const kafka_replication_factor = process.env.KAFKA_REPLICATION_FACTOR || config.kafka.replication_factor || 1;
const cookie_name = process.env.TRACKER_COOKIE_NAME || config.tracker.cookie_name || "revengine_browser_id"
const headers = {
    "Content-Type": "text/html",
    "Content-Disposition": "inline",
    "Access-Control-Allow-Origin": "*",
    "X-Powered-By": `${tracker_name}`,
};
const index = process.env.INDEX || config.debug ? "pageviews_test" : "pageviews";

const queue_1 = new KafkaProducer({ kafka_server, topic: `${topic}-1`, partitions: kafka_partitions, replication_factor: kafka_replication_factor, debug: true });
const queue_2 = new KafkaProducer({ kafka_server, topic: `${topic}-2`, partitions: kafka_partitions, replication_factor: kafka_replication_factor });

const consumer_1 = new KafkaConsumer({ kafka_server, topic: `${topic}-1` });
consumer_1.on("message", async (message) => {
    try {
        const esdata = await enrich_tracker(message);
        await queue_2.send(esdata);
    } catch (err) {
        console.error(err);
    }
});

const parse_url = (url) => {
    if (!url) throw "No url";
    let parts = url.split("?");
    if (parts.length !== 2) throw `Misformed url ${url}`;
    return qs.parse(parts[1]);
};

const handle_hit = async (req, res) => {
    let browser_id = null;
    const url = req.url;
    let cache_id = null;
    let data = undefined;
    try {
        data = parse_url(url);
        data.user_ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;
        data.user_agent = req.headers["user-agent"];
        const cookies = cookie.parse(req.headers.cookie || "");
        if (cookies[cookie_name]) {
            browser_id = cookies[cookie_name]
        } else {
            browser_id = data.browser_id || myCrypto.randomBytes(20).toString('hex');
            headers["Set-Cookie"] = `${cookie_name}=${browser_id}`;
        }
        cache_id = `GET-${browser_id}-${data.user_ip}`;
        if (config.debug) console.log({cache_id});
        const cached_user_data_json = await redis.get(cache_id);
        let cached_user_data = null;
        try {
            cached_user_data = JSON.parse(cached_user_data_json);
        } catch (e) {
            console.error(e);
        }
        if (cached_user_data) {
            if (config.debug) console.log("Cache hit", cached_user_data);
            data.user_labels = cached_user_data.user_labels;
            data.user_segments = cached_user_data.user_segments;
        } else {
            if (config.debug) console.log("Cache miss");
            let { user_labels, user_segments } = await get_user_data(data.user_id);
            data.user_labels = user_labels || {};
            data.user_segments = user_segments || {};
            await redis.set(cache_id, JSON.stringify({user_labels, user_segments}), 'EX', 60 * 60);
        }
    } catch (err) {
        console.error(err);
    }
    res.writeHead(200, headers);
    res.write(
        JSON.stringify({
            status: "ok",
            user_labels: data?.user_labels,
            user_segments: data?.user_segments,
        })
    );
    res.end();
    try {
        if (!data) throw `No data ${url}`;
        if (!data.action) throw `No action ${url}`;
        const referer = req.headers.referer; // Our tracker is embedded as an iframe or image or similar, so it should always have a referer.
        if (!data.referer) return; // This is common with bots or noreferrer policy, we can't track it anyway, so don't worry about throwing an error
        data.url = referer;
        data.browser_id = browser_id;
        await queue_1.send(data);
    } catch (err) {
        console.error(err);
    }
};

console.log(`===${tracker_name} Tracker Started===`);
if (config.debug) console.log("Debug mode on");

export const app = http.createServer(async (req, res) => {
    if (req.url == "/favicon.ico") return;
    if (config.debug) console.log({ headers: req.headers });
    if (req.method === "GET") {
        await handle_hit(req, res);
    } else {
        res.writeHead(404, headers);
        res.write(JSON.stringify({ status: "error", error: "You lost?" }));
        res.end();
    }
}).listen(port, host, async () => {
    await redis.connect();
    if (config.debug) console.log(`RevEngine Tracker listening ${host}:${port}`);
});