// Process for all hits
// 1. Get hit
// 1.1 Check cache and skip to 3 if hit is in cache
// 2. Get user segments and labels
// 3. Respond to HTTP request with ok, user segments and labels
// 4. Send to kafka queue_1 (topic-1)
// 5. Listen to kafka queue_1 (topic-1)
// 6. Get a message through queue_1
// 7. Enrich message
// 8. Sent to kafka queue_2 (topic-2)
// 9. Listen to kafka queue_2 (topic-2)
// 10. Get a message through queue_2 (topic-2)
// 11. Save to ElasticSearch


// Imports
import { EventTrackerMessage } from "./event_tracker_types";
import { KafkaConsumer, KafkaProducer } from "@revengine/common/kafka";
import config from "config";
import http from "http";
import { enrich_tracker } from "./enrich_tracker";
import { get_user_data } from "./user";
import qs from "qs";
import cookie from "cookie";
import { createClient } from "redis";
import myCrypto from "crypto";
import esclient from "@revengine/common/esclient";

// Constants
const tracker_name = process.env.TRACKER_NAME || config.name || "revengine";
const port = process.env.PORT || config.tracker.port || 3012;
const kafka_server = process.env.KAFKA_SERVER || config.kafka.server || "localhost:9092";
const host = process.env.TRACKER_HOST || config.tracker.host || "127.0.0.1";
const topic = process.env.TRACKER_KAFKA_TOPIC || config.tracker.kafka_topic || `${tracker_name}_events`;
const kafka_partitions = process.env.KAFKA_PARTITIONS || config.kafka.partitions || 1;
const kafka_replication_factor = process.env.KAFKA_REPLICATION_FACTOR || config.kafka.replication_factor || 1;
const cookie_name = process.env.TRACKER_COOKIE_NAME || config.tracker.cookie_name || "revengine_browser_id"
const headers = {
    "Content-Type": "text/json",
    "Content-Disposition": "inline",
    "Access-Control-Allow-Origin": "*",
    "X-Powered-By": `${tracker_name}`,
};
const index = process.env.INDEX || (config.debug ? "pageviews_test" : "pageviews");
const redis_url = process.env.REDIS_URL || config.redis.url || "redis://localhost:6379";
const redis_password = process.env.REDIS_PASSWORD || config.redis.password || undefined;

// Setup
const redis = createClient({ url: redis_url, password: redis_password });

const queue_1 = new KafkaProducer({ kafka_server, topic: `${topic}-1`, partitions: kafka_partitions, replication_factor: kafka_replication_factor, debug: true });
const queue_2 = new KafkaProducer({ kafka_server, topic: `${topic}-2`, partitions: kafka_partitions, replication_factor: kafka_replication_factor });
const queue_test = new KafkaProducer({ kafka_server, topic: `${topic}-test`, partitions: kafka_partitions, replication_factor: kafka_replication_factor, debug: true });

const consumer_1 = new KafkaConsumer({ kafka_server, topic: `${topic}-1` });
const consumer_2 = new KafkaConsumer({ kafka_server, topic: `${topic}-2` });

// Check esclient index
const ensure_index = async () => await esclient.ensure_index(index, {
    action: { type: "keyword" },
    article_id: { type: "keyword" },
    author_id: { type: "keyword" },
    browser_id: { type: "keyword" },
    content_type: { type: "keyword" },
    derived_referer_medium: { type: "keyword" },
    derived_referer_source: { type: "keyword" },
    derived_ua_browser: { type: "keyword" },
    derived_ua_browser_version: { type: "keyword" },
    derived_ua_device: { type: "keyword" },
    derived_ua_os: { type: "keyword" },
    index: { type: "keyword" },
    post_id: { type: "integer" },
    post_type: { type: "keyword" },
    referer: { type: "keyword" },
    sections: { type: "keyword" },
    tags: { type: "keyword" },
    test_id: { type: "keyword" },
    time: { type: "date" },
    url: { type: "keyword" },
    user_agent: { type: "keyword" },
    user_id: { type: "integer" },
    user_ip: { type: "ip" },
    signed_in: { type: "boolean" },
    user_labels: { type: "keyword" },
    user_segments: { type: "keyword" },
    date_published: { type: "date" },
    data: { type: "object" },
});

// Queue listeners

// Enrichment
consumer_1.on("message", async (message: EventTrackerMessage) => {
    try {
        const esdata = await enrich_tracker(message);
        // For testing, we don't want to send the test message to the next queue
        if (message.action === "test") {
            await queue_test.send(esdata);
            return;
        }
        await queue_2.send(esdata);
    } catch (err) {
        console.error(err);
    }
});

// ElasticSearch
consumer_2.on("message", async (message: EventTrackerMessage) => {
    try {
        const data = {
            index,
            document: message
        };
        // console.log(data);
        const result = await esclient.index(data);
        if (config.debug) console.log(result);
    } catch (err) {
        console.error(err);
    }
});

// Functions
const parse_url = (url) => {
    if (!url) throw "No url";
    let parts = url.split("?");
    if (parts.length !== 2) throw `Misformed url ${url}`;
    return qs.parse(parts[1]);
};

const handle_hit = async (data: EventTrackerMessage, req, res) => {
    // console.log({data})
    let browser_id = null;
    const url = req.url;
    let cache_id = null;
    try {
        data.user_ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;
        data.user_agent = req.headers["user-agent"];
        data.test_id = data.test_id || null;
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
            data.user_labels = cached_user_data.user_labels || [];
            data.user_segments = cached_user_data.user_segments || [];
        } else {
            if (config.debug) console.log("Cache miss");
            let { user_labels, user_segments } = await get_user_data(data.user_id);
            data.user_labels = user_labels || [];
            data.user_segments = user_segments || [];
            await redis.set(cache_id, JSON.stringify({user_labels, user_segments}), { EX: 60 * 60 });
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
        if (!referer) {
            if (config.debug) console.log("No referer", { status: "error", message: "no referer" });
            return; // This is common with bots or noreferrer policy, we can't track it anyway, so don't worry about throwing an error
        }
        data.url = referer;
        data.browser_id = browser_id;
        await queue_1.send(data);
    } catch (err) {
        console.error(err);
    }
};

// Server
export const app = http.createServer(async (req, res) => {
    if (req.url == "/favicon.ico") return;
    if (config.debug) console.log({ headers: req.headers });
    if (req.method === "GET") {
        const url = req.url;
        try {
            const data: EventTrackerMessage = parse_url(url);
            await handle_hit(data, req, res);
        } catch (err) {
            console.error(err);
            res.writeHead(400, headers);
            res.write(JSON.stringify({ status: "error", error: err }));
            res.end();
        }
    } else if (req.method === "POST") {
        try {
            const data: EventTrackerMessage = await new Promise((res, rej) => {
                let body = "";
                req.on("data", chunk => {
                    body += chunk.toString();
                });
                req.on("end", () => {
                    try {
                        res(JSON.parse(body));
                    } catch (err) {
                        rej(err);
                    }
                });
            });
            await handle_hit(data, req, res);
        } catch (err) {
            console.error(err);
            res.writeHead(400, headers);
            res.write(JSON.stringify({ status: "error", error: err }));
            res.end();
        }
    } else {
        res.writeHead(404, headers);
        res.write(JSON.stringify({ status: "error", error: "You lost?" }));
        res.end();
    }
}).listen(port, host, async () => {
    await redis.connect();
    await ensure_index();
    if (config.debug) console.log(`RevEngine Tracker listening ${host}:${port}`);
});

console.log(`===${tracker_name} Tracker Started===`);
if (config.debug) console.log("Debug mode on");