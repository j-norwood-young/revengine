// Process for all hits
// 1. Get hit
// 1.1 Check cache and skip to 3 if hit is in cache
// 2. Get user segments and labels
// 3. Respond to HTTP request with ok, user segments and labels
// 4. Send to Kafka topic 1
// 5. Process topic 1 message
// 6. Get a message through topic 1
// 7. Enrich message
// 8. Send to Kafka topic 2
// 9. Process topic 2 message
// 10. Get a message through topic 2
// 11. Save to ElasticSearch


// Imports
import { EventTrackerMessage } from "./event_tracker_types";
import { pub, sub } from "@revengine/common/kafka-queue";
import config from "config";
import * as http from "http";
import { enrich_tracker } from "./enrich_tracker";
import { get_user_data } from "./user";
import qs from "qs";
import * as cookie from "cookie";
import * as myCrypto from "crypto";
import esclient from "@revengine/common/esclient";
import Cache from "@revengine/common/cache";
import * as dotenv from "dotenv";
import { geolocate_ip } from "./geolocate_ip";

dotenv.config();

// Constants
const tracker_name = process.env.TRACKER_NAME || config.name || "revengine";
const cache = new Cache({ prefix: `event-tracker-${tracker_name}`, debug: false, ttl: 60 * 60 });
const port = process.env.PORT || config.tracker.port || 3012;
const host = process.env.TRACKER_HOST || config.tracker.host || "127.0.0.1";
const cookie_name = process.env.TRACKER_COOKIE_NAME || config.tracker.cookie_name || "revengine_browser_id"
const headers = {
    "Content-Type": "application/json; charset=UTF-8",
    "Content-Disposition": "inline",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "X-Powered-By": `${tracker_name}`,
};
const debug = process.env.DEBUG || config.debug;
const index = process.env.INDEX || (debug ? "pageviews_test" : "pageviews");

// Initialize Redis cache for document tracking
const doc_cache = new Cache({ 
    prefix: `${tracker_name}-doc-mapping`,
    debug: false,
    ttl: 60 * 60 * 24 // 1 day
});

// Initialize queues with Kafka topics
const queue_1_publisher = new pub(process.env.KAFKA_TOPIC);
const queue_2_publisher = new pub(process.env.KAFKA_TOPIC_2);
const queue_test_publisher = new pub(`${tracker_name}_events_test`);

// Initialize queue subscribers
// Queue 1 subscriber - handles enrichment
new sub(async (message: EventTrackerMessage) => {
    try {
        const esdata = await enrich_tracker(message);
        // For testing, we don't want to send the test message to the next queue
        if (message.action === "test") {
            await queue_test_publisher.addJob("test", esdata);
            return;
        }
        await queue_2_publisher.addJob("enrich", esdata);
    } catch (err) {
        console.error(err);
    }
}, process.env.KAFKA_TOPIC, process.env.KAFKA_GROUP);

// Queue 2 subscriber - handles elasticsearch storage
new sub(async (message: EventTrackerMessage) => {
    try {
        let docId = null;
        // Check if we have an existing document for this browser_id and article_id
        if (message.browser_id && message.post_id) {
            const mappingKey = `${message.browser_id}:${message.post_id}`;
            docId = await doc_cache.get(mappingKey);
        }

        // Add time_updated to track document modifications
        const enrichedMessage = {
            ...message,
            time_updated: new Date().toISOString()
        };
        let result;
        if (docId) {
            // Update existing document
            result = await esclient.update({
                index,
                id: docId,
                doc: enrichedMessage,
                doc_as_upsert: true
            });
            debug && console.log(`Updated existing document ${docId}`);
        } else {
            // Create new document
            result = await esclient.index({
                index,
                document: enrichedMessage
            });

            // Store the mapping if we have browser_id and article_id
            if (message.browser_id && message.post_id && result._id) {
                const mappingKey = `${message.browser_id}:${message.post_id}`;
                await doc_cache.set(mappingKey, result._id);
                debug && console.log(`Created new document mapping ${mappingKey} -> ${result._id}`);
            }
        }
        
        debug && console.log(result);
    } catch (err) {
        console.error(err);
    }
}, process.env.KAFKA_TOPIC_2, process.env.KAFKA_GROUP_2);

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
    title: { type: "text" },
    time_updated: { type: "date" },
    seconds_on_page: { type: "integer" },
    scroll_depth: { type: "integer" },
});

const get_ip = (req) => {
    let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (ip.includes(",")) {
        ip = ip.split(",")[0].trim();
    }
    return ip;
}

// Functions
const parse_url = (url) => {
    if (!url) throw "No url";
    let parts = url.split("?");
    if (parts.length !== 2) throw `Misformed url ${url}`;
    return qs.parse(parts[1]);
};

const handle_hit = async (data: EventTrackerMessage, req, res) => {
    let browser_id = null;
    const url = req.url;
    let cache_id = null;
    try {
        data.user_ip = get_ip(req);
        data.user_agent = req.headers["user-agent"];
        data.test_id = data.test_id || null;
        const cookies = cookie.parse(req.headers.cookie || "");
        
        if (data.user_id) {
            // Create MD5 hash for browser_id when user_id is present
            const md5Hash = myCrypto.createHash('md5');
            md5Hash.update(`${data.user_id}${data.user_agent}`);
            browser_id = md5Hash.digest('hex');
        } else if (cookies[cookie_name]) {
            browser_id = cookies[cookie_name];
        } else {
            browser_id = data.browser_id || myCrypto.randomBytes(20).toString('hex');
        }

        // Set the cookie with proper attributes
        const cookieOptions: cookie.CookieSerializeOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Set to true in production
            sameSite: 'lax', // or 'strict' or 'none', depending on your requirements
            maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
            path: '/'
        };
        headers["Set-Cookie"] = cookie.serialize(cookie_name, browser_id, cookieOptions);
        cache_id = `GET-${browser_id}-${data.user_ip}`;
        debug && console.log({cache_id});
        const cached_user_data = await cache.get(cache_id);
        if (cached_user_data) {
            debug && console.log("Cache hit", cached_user_data);
            data.user_labels = cached_user_data.user_labels || [];
            data.user_segments = cached_user_data.user_segments || [];
        } else {
            debug && console.log("Cache miss");
            let { user_labels, user_segments } = await get_user_data(data.user_id);
            data.user_labels = user_labels || [];
            data.user_segments = user_segments || [];
            await cache.set(cache_id, {user_labels, user_segments});
        }
        const location = await geolocate_ip(data.user_ip);
        data.derived_city = location.derived_city;
        data.derived_country = location.derived_country;
        data.derived_country_code = location.derived_country_code;
        data.derived_latitude = location.derived_latitude;
        data.derived_longitude = location.derived_longitude;
        data.derived_region = location.derived_region;
    } catch (err) {
        console.error(err);
    }
    res.writeHead(200, headers);
    res.write(
        JSON.stringify({
            status: "ok",
            user_labels: data?.user_labels,
            user_segments: data?.user_segments,
            browser_id,
            location: {
                city: data?.derived_city,
                country: data?.derived_country,
                country_code: data?.derived_country_code,
                latitude: data?.derived_latitude,
                longitude: data?.derived_longitude,
                region: data?.derived_region,
            }
        })
    );
    res.end();
    try {
        if (!data) throw `No data ${url}`;
        if (!data.action) {
            if (config.debug) console.log("No action", { status: "error", message: "no action" });
            return;
        }
        if (!data.url) {
            data.url = req.headers.referer;
        }
        if (!data.url) {
            if (config.debug) console.log("No referer or url", { status: "error", message: "no referer" });
            return;
        }
        data.browser_id = browser_id;
        await queue_1_publisher.addJob("enrich", data);
    } catch (err) {
        console.error(err);
    }
};

// Server
export const app = http.createServer(async (req, res) => {
    if (req.url == "/favicon.ico") return;
    debug && console.log({ headers: req.headers });

    if (req.method === "OPTIONS") {
        res.writeHead(200, headers);
        res.end();
    } else if (req.url === "/ping") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.write("pong");
        res.end();
    } else if (req.url === "/robots.txt") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.write("User-agent: *\nDisallow: /");
        res.end();
    } else if (req.method === "GET") {
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
    await ensure_index();
    debug && console.log(`RevEngine Tracker listening ${host}:${port}`);
});

// Cleanup on server shutdown
process.on('SIGTERM', async () => {
    debug && console.log('SIGTERM signal received: closing HTTP server');
    await queue_1_publisher.close();
    await queue_2_publisher.close();
    await queue_test_publisher.close();
    app.close(() => {
        debug && console.log('HTTP server closed');
        process.exit(0);
    });
});

console.log(`===${tracker_name} Tracker Started===`);
debug && console.log("Debug mode on");

// Print metrics every minute
setInterval(async () => {
    const q1 = await queue_1_publisher.getMetrics();
    const q2 = await queue_2_publisher.getMetrics();
    const q3 = await queue_test_publisher.getMetrics();
    console.log({q1, q2, q3});
}, 60 * 1000);
