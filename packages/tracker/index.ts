// DEPRECATED

import config from "config";
import http from "http";
import { parse_user_agent } from "./user_agent";
import { geolocate_ip } from "./geolocate_ip";
import { parse_referer } from "./referer";
import { parse_utm } from "./utm";
import { get_article_data } from "./article";
import { get_user_data } from "./user";
import { KafkaProducer } from "@revengine/common/kafka";
import Cache from "@revengine/common/cache";

import qs from "qs";
import cookie from "cookie";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

const name = process.env.TRACKER_NAME || config.name || "revengine";
const cache = new Cache({ prefix: `tracker-${name}`, debug: false, ttl: 60 * 60 });
const port = process.env.PORT || config.tracker.port || 3012;
const host = process.env.TRACKER_HOST || config.tracker.host || "127.0.0.1";
const topic = process.env.TRACKER_KAFKA_TOPIC || config.tracker.kafka_topic || `${name}_events`;
const cookie_name = process.env.TRACKER_COOKIE_NAME || config.tracker.cookie_name || "revengine_browser_id"
const allow_origin = process.env.TRACKER_ALLOWED_ORIGINS || config.tracker.allow_origin || "*";

const headers = {
    "Content-Type": "application/json; charset=UTF-8",
    "Content-Disposition": "inline",
    // "Access-Control-Allow-Origin": allow_origin,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "X-Powered-By": `${name}`,
};
const index = process.env.INDEX || (config.debug ? "pageviews_test" : "pageviews_copy");

console.log({index, debug: config.debug});

let producer = null;
try {
    while (!producer) {
        producer = new KafkaProducer({ topic });
        
    }
} catch (err) {
    console.error(err.toString());
}

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

const set_esdata = async (data) => {
    if (data.user_id === "0" || data.user_id === 0) {
        data.user_id = null;
    }
    const action = data.action || "hit";
    const esdata = Object.assign(
        {
            index,
            action,
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
            time_updated: new Date().toISOString(),
            seconds_on_page: Math.round(data.seconds_on_page) || 0,
            scroll_depth: Math.round(data.scroll_depth) || 0,
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

const get_ip = (req) => {
    let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (ip.includes(",")) {
        ip = ip.split(",")[0].trim();
    }
    return ip;
}

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
                data.user_id = Number(data.user_id) || 0;
                let { user_labels, user_segments } = await get_user_data(data.user_id);
                data.user_labels = user_labels || {};
                data.user_segments = user_segments || {};
                if (config.debug) {
                    console.log(data);
                }
                const cookies = cookie.parse(req.headers.cookie || "");
                // console.log({cookies: req.headers.cookie});
                if (data.user_id) {
                    // Create MD5 hash for browser_id when user_id is present
                    const md5Hash = crypto.createHash('md5');
                    md5Hash.update(`${data.user_id}${data.user_agent}`);
                    data.browser_id = md5Hash.digest('hex');
                } else if (cookies[cookie_name]) {
                    data.browser_id = cookies[cookie_name];
                } else {
                    data.browser_id = data.browser_id || crypto.randomBytes(20).toString('hex');
                }

                // Set the cookie with proper attributes
                const cookieOptions: cookie.CookieSerializeOptions = {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production', // Set to true in production
                    sameSite: 'lax', // or 'strict' or 'none', depending on your requirements
                    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
                    path: '/'
                };
                res.setHeader('Set-Cookie', cookie.serialize(cookie_name, data.browser_id, cookieOptions));

                data.user_ip = data.user_ip || get_ip(req);
                const location = await geolocate_ip(data.user_ip);
                data.derived_city = location.derived_city;
                data.derived_country = location.derived_country;
                data.derived_country_code = location.derived_country_code;
                data.derived_latitude = location.derived_latitude;
                data.derived_longitude = location.derived_longitude;
                data.derived_region = location.derived_region;
                res.writeHead(200, headers);
                res.write(
                    JSON.stringify({
                        status: "ok",
                        user_labels,
                        user_segments,
                        browser_id: data.browser_id,
                        user_ip: data.user_ip,
                        location: {
                            city: data.derived_city,
                            country: data.derived_country,
                            country_code: data.derived_country_code,
                            latitude: data.derived_latitude,
                            longitude: data.derived_longitude,
                            region: data.derived_region,
                        }
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
                console.error(err.toString());
                return null;
            }
            try {
                if (!data) throw "No data";
                const esdata = await set_esdata(data);
                if (config.debug) console.log(esdata);
                await send_to_kafka(esdata);
            } catch (err) {
                console.error(err.toString());
            }
        });
    } catch (err) {
        console.error(err.toString());
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
        if (!data) {
            throw new Error(`Failed to parse URL: ${url}`);
        }
        data.user_ip = get_ip(req);
        data.user_agent = req.headers["user-agent"];
        const cookies = cookie.parse(req.headers.cookie || "");
        if (data.user_id) {
            // Create MD5 hash for browser_id when user_id is present
            const md5Hash = crypto.createHash('md5');
            md5Hash.update(`${data.user_id}${data.user_agent}`);
            browser_id = md5Hash.digest('hex');
        } else if (cookies[cookie_name]) {
            browser_id = cookies[cookie_name];
        } else {
            browser_id = data.browser_id || crypto.randomBytes(20).toString('hex');
        }
        
        // Set the cookie with proper attributes
        const cookieOptions: cookie.CookieSerializeOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Set to true in production
            sameSite: 'lax', // or 'strict' or 'none', depending on your requirements
            maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
            path: '/'
        };
        res.setHeader('Set-Cookie', cookie.serialize(cookie_name, browser_id, cookieOptions));
        // console.log({browser_id, cookie_name, cookieOptions});
        cache_id = `GET-${browser_id}-${data.user_ip}`;
        if (config.debug) {
            console.log({cache_id});
        }
        const cached_user_data = await cache.get(cache_id);
        if (cached_user_data) {
            if (config.debug) console.log("Cache hit", cached_user_data);
            data.user_labels = cached_user_data.user_labels;
            data.user_segments = cached_user_data.user_segments;
        } else {
            if (config.debug) console.log("Cache miss");
            let { user_labels, user_segments } = await get_user_data(data.user_id);
            data.user_labels = user_labels || {};
            data.user_segments = user_segments || {};
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
        console.error(err.toString());
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
        if (!data.action) throw `No action ${url}`;
        const referer = req.headers.referer;
        data.url = data.url || referer;
        data.browser_id = browser_id;
        const esdata = await set_esdata(data);
        if (config.debug) {
            console.log({ esdata });
        }
        await send_to_kafka(esdata);
    } catch (err) {
        console.error(err.toString());
    }
};

console.log(`===${config.name} Tracker Started===`);
if (config.debug) console.log("Debug mode on");

http.createServer((req, res) => {
    if (req.url == "/favicon.ico") return;
    if (config.debug) {
        console.log({ headers: req.headers });
    }
    if (req.method === "OPTIONS") {
        res.writeHead(200, headers);
        res.end();
        return;
    }
    if (
        req.method === "POST" &&
        req.headers["content-type"] === "application/json"
    ) {
        post_hit(req, res);
    }
    else if (req.method === "GET") {
        if (req.url === "/robots.txt") {
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.write("User-agent: *\nDisallow: /");
            res.end();
            return;
        }
        if (req.url === "/ping") {
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.write("pong");
            res.end();
            return;
        }
        get_hit(req, res);
    } else {
        res.writeHead(404, headers);
        res.write(JSON.stringify({ status: "error", error: "You lost?" }));
        res.end();
    }
}).listen(port, host, async () => {
    if (config.debug) {
        console.log(`RevEngine Tracker listening ${host}:${port}`);
    }
});
