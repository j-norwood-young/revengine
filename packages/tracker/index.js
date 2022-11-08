const config = require("config");
const http = require("http");
const kafka = require("kafka-node");
const parse_user_agent = require("./user_agent").parse_user_agent;
const geolocate_ip = require("./geolocate_ip").geolocate_ip;
const parse_referer = require("./referer").parse_referer;
const parse_utm = require("./utm").parse_utm;
const get_article_data = require("./article").get_article_data;
const get_user_data = require("./user").get_user_data;
const qs = require("qs");
const cookie = require("cookie");
const crypto = require("crypto");
const Redis = require("redis");
const redis = Redis.createClient();

const name = config.name || "revengine";
const port = config.tracker.port || 3012;
const host = config.tracker.host || "127.0.0.1";
const topic = config.tracker.kafka_topic || `${name}_events`;
const cookie_name = config.tracker.cookie_name || "revengine_browser_id"
const headers = {
    "Content-Type": "text/html",
    "Content-Disposition": "inline",
    "Access-Control-Allow-Origin": "*",
    "X-Powered-By": `${name}`,
};
const index = config.debug ? "pageviews_test" : "pageviews";

const Producer = kafka.Producer;

const client = new kafka.KafkaClient({
    kafkaHost: config.kafka.server || "localhost:9092",
});
const producer = new Producer(client);

// Process for all hits
// 1. Get hit
// 1.1 Check cache and skip to 3 if hit is in cache
// 2. Get user segments and labels
// 3. Respond to HTTP request with ok, user segments and labels
// 4. Parse user agent
// 5. Get geolocation for user
// 6. Parse referrer
// 7. Parse utm params
// 8. Get post data
// 9. Sent to kafka queue

if (config.debug) {
    console.log({
        topic,
        server: config.kafka.server || "localhost:9092",
        partitions: config.kafka.partitions || 1,
        replicationFactor: config.kafka.replication_factor || 1,
    });
}
// Ensure we have the topic created
client.createTopics(
    [
        {
            topic,
            partitions: config.kafka.partitions || 1,
            replicationFactor: config.kafka.replication_factor || 1,
        },
    ],
    (err, result) => {
        if (config.debug) console.log("createTopics", err, result);
        if (err) {
            console.error("Error creating topic");
            console.error(err);
            return process.exit(1);
        }
    }
);

const set_esdata = async (data) => {
    if (data.user_id === "0") {
        data.user_id = null;
    }
    console.log(data);
    const esdata = Object.assign(
        {
            index,
            action: "hit",
            article_id: data.post_id,
            referer: data.referer,
            url: data.url,
            signed_in: !!data.user_id,
            time: new Date(),
            user_agent: data.user_agent,
            user_id: data.user_id,
            browser_id: data.browser_id,
            content_type: data.post_type,
            user_labels: data.user_labels,
            user_segments: data.user_segments,
        },
        parse_user_agent(data.user_agent),
        await geolocate_ip(data.user_ip),
        parse_referer(data.referer, data.url),
        parse_utm(data.url),
        await get_article_data(data.post_id),
    );
    if (data.user_ip) esdata.user_ip = data.user_ip;
    return esdata;
};

const send_to_kafka = async (data) => {
    return await new Promise((resolve, reject) => {
        producer.send(
            [
                {
                    topic,
                    messages: JSON.stringify(data),
                },
            ],
            (err, result) => {
                if (err) return reject(err);
                return resolve(result);
            }
        );
    });
};

const post_hit = async (req, res) => {
    let data = undefined;
    try {
        let parts = [];
        req.on("data", (chunk) => {
            parts.push(chunk);
        }).on("end", async () => {
            const body = Buffer.concat(parts).toString();
            try {
                try {
                    data = JSON.parse(body);
                } catch (e) {
                    throw "Error parsing json";
                }
                if (!data) throw `No data`;
                // Check required fields
                const required_fields = [
                    "user_agent",
                    "url",
                    "action",
                ];
                const check_result = required_fields.every((f) =>
                    data.hasOwnProperty(f)
                );
                if (!check_result) throw "Missing fields";
                let { user_labels, user_segments } = await get_user_data(data.user_id);
                data.user_labels = user_labels || {};
                data.user_segments = user_segments || {};
                if (config.debug) {
                    console.log(data);
                }
                const cookies = cookie.parse(req.headers.cookie || "");
                if (cookies[cookie_name]) {
                    data.browser_id = cookies[cookie_name]
                } else {
                    data.browser_id = data.browser_id || crypto.randomBytes(20).toString('hex');
                    headers["Set-Cookie"] = `${cookie_name}=${data.browser_id}`;
                }
                data.user_ip = data.user_ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;
                res.writeHead(200, headers);
                res.write(
                    JSON.stringify({
                        status: "ok",
                        user_labels,
                        user_segments,
                        browser_id: data.browser_id,
                        user_ip: data.user_ip,
                    })
                );
                res.end();
            } catch (err) {
                res.writeHead(500, headers);
                res.write(
                    JSON.stringify({
                        status: "error",
                        error: err,
                    })
                );
                res.end();
                console.error(err);
                return null;
            }
            try {
                if (!data) throw "No data";
                const esdata = await set_esdata(data);
                if (config.debug) console.log(esdata);
                await send_to_kafka(esdata);
            } catch (err) {
                console.error(err);
            }
        });
    } catch (err) {
        console.error(err);
    }
};

const parse_url = (url) => {
    if (!url) throw "No url";
    let parts = url.split("?");
    if (parts.length !== 2) throw `Misformed url ${url}`;
    return qs.parse(parts[1]);
};

const get_hit = async (req, res) => {
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
            browser_id = data.browser_id || crypto.randomBytes(20).toString('hex');
            headers["Set-Cookie"] = `${cookie_name}=${browser_id}`;
        }
        cache_id = `GET-${browser_id}-${data.user_ip}`;
        if (config.debug) {
            console.log({cache_id});
        }
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
        // if (!data.referer) return; // This is common with bots or noreferrer policy, we can't track it anyway, so don't worry about throwing an error
        data.url = referer;
        data.browser_id = browser_id;
        const esdata = await set_esdata(data);
        if (config.debug) {
            console.log({ esdata });
        }
        await send_to_kafka(esdata);
    } catch (err) {
        console.error(err);
    }
};

console.log(`===${config.name} Tracker Started===`);
if (config.debug) console.log("Debug mode on");

http.createServer((req, res) => {
    if (req.url == "/favicon.ico") return;
    if (config.debug) {
        console.log({ headers: req.headers });
    }
    if (
        req.method === "POST" &&
        req.headers["content-type"] === "application/json"
    ) {
        post_hit(req, res);
    }
    else if (req.method === "GET") {
        get_hit(req, res);
    } else {
        res.writeHead(404, headers);
        res.write(JSON.stringify({ status: "error", error: "You lost?" }));
        res.end();
    }
}).listen(port, host, async () => {
    await redis.connect();
    if (config.debug) {
        console.log(`RevEngine Tracker listening ${host}:${port}`);
    }
});
