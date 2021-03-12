const config = require("config");
const http = require('http')
const kafka = require('kafka-node');
const Bowser = require("bowser");
const utmExtractor = require("utm-extractor").Utm;
const qs = require("qs");
const Referer = require('referer-parser');

const name = config.name || "revengine";
const port = config.tracker.port || 3012
const host = config.tracker.host || "127.0.0.1"
const topic = config.tracker.kafka_topic || `${name}_events`;
const headers = {
    'Content-Type': 'text/html',
    'Content-Disposition': 'inline',
    'Access-Control-Allow-Origin': '*',
    'X-Powered-By': `${name}`
};

const Producer = kafka.Producer;
const client = new kafka.KafkaClient({ kafkaHost: config.kafka.server || "localhost:9092" });
const producer = new Producer(client);

// Ensure we have the topic created
client.createTopics([
    {
        topic,
        partitions: config.kafka.partitions || 1,
        replicationFactor: config.kafka.replication_factor || 1
    }
], (err, result) => {
    if (err) {
        console.error("Error creating topic");
        console.error(err);
        return process.exit(1);
    }
    // console.log(result);
});

const set_esdata = (index, data) => {
    const ua = Bowser.parse(data.user_agent);
    let utm = {};
    try {
        utm = new utmExtractor(data.url).get();
    } catch (err) {
        utm = {
            utm_medium: null,
            utm_campaign: null,
            utm_content: null,
            utm_source: null,
            utm_term: null,
        }
    }
    let derived_referer_medium = "direct";
    let derived_referer_source = "";
    if (data.referer) {
        let derived_referer = new Referer(data.referer, data.url);
        derived_referer_medium = derived_referer.medium;
        derived_referer_source = derived_referer.referer;
        if (derived_referer_medium === "unknown") derived_referer_medium = "external";
        if (config.debug) {
            console.log({ known: derived_referer.known, referer: derived_referer.referer, medium: derived_referer.medium, search_parameter: derived_referer.search_parameter, search_term: derived_referer.search_term });
        }
    }
    if (data.user_id === "0") {
        data.user_id = null;
    }
    if (utm.utm_medium === "email") derived_referer_medium = "email";
    const esdata = {
        index,
        action: "hit",
        article_id: data.post_id,
        author_id: data.post_author,
        derived_ua_browser: ua.browser.name,
        derived_ua_browser_version: ua.browser.version,
        derived_ua_device: ua.platform.type,
        derived_ua_os: ua.os.name,
        derived_ua_os_version: ua.os.version,
        derived_ua_platform: ua.platform.vendor,
        derived_referer_medium,
        derived_referer_source,
        referer: data.referer,
        signed_in: !!(data.user_id),
        sections: data.post_sections,
        time: new Date(),
        url: data.url,
        user_agent: data.user_agent,
        user_id: data.user_id,
        utm_medium: utm.utm_medium,
        utm_campaign: utm.utm_campaign,
        utm_content: utm.utm_content,
        utm_source: utm.utm_source,
        utm_term: utm.utm_term,
        browser_id: data.browser_id,
    }
    if (data.user_ip) esdata.user_ip = data.user_ip;
    if (config.debug) {
        console.log({ esdata });
    }
    return esdata;
}

const post_hit = async (req, res) => {
    try {
        let parts = [];
        req.on('data', (chunk) => {
            parts.push(chunk);
        }).on('end', async () => {
            const body = Buffer.concat(parts).toString();
            let data = null;
            try {
                data = JSON.parse(body);
                if (config.debug) {
                    console.log(data);
                }
                res.writeHead(200, headers);
                res.write("");
                res.end();
            } catch(err) {
                res.writeHead(500, headers);
                res.write(JSON.stringify({
                    status: "error",
                    error: JSON.stringify(err)
                }))
                res.end();
                console.error(err);
                return null;
            }
            try {
                if (!data) throw "No data";
                if (!data.action) throw "No action";
                let index = null;
                if (data.action === "pageview") {
                    index = "pageviews";
                }
                if (!index) throw `No index found for action ${data.action}`;
                const esdata = set_esdata(index, data);
                await new Promise((resolve, reject) => {
                    producer.send([{
                        topic,
                        messages: JSON.stringify(esdata),
                    }], (err, data) => {
                        if (err) return reject(err);
                        return resolve(data);
                    });
                });
            } catch(err) {
                console.error(err);
            }
        });
    } catch (err) {
        console.error(err);
    }
}

const get_hit = async (req, res) => {
    res.writeHead(200, headers);
    res.write(JSON.stringify({
        status: "ok"
    }))
    res.end();
    try {
        const url = req.url;
        if (!url) throw "No url";
        let parts = url.split("?");
        if (parts.length !== 2) throw `Misformed url ${url}`;
        let data = qs.parse(parts[1]);
        if (!data) throw `No data ${url}`;
        if (!data.action) throw `No action ${url}`;
        let index = null;
        if (data.action === "pageview") {
            index = "pageviews";
        }
        if (!index) throw `No index found for action ${data.action}`;
        const referer = req.headers.referer || data.referer;
        if (!referer) return; // This is common with bots or noreferrer policy, we can't track it anyway, so don't worry about throwing an error
        data.url = referer;
        data.user_agent = req.headers["user-agent"];
        if (req.headers["x-real-ip"]) data.user_ip = req.headers["x-real-ip"];
        const esdata = set_esdata(index, data);
        if (config.debug) console.log(esdata);
        await new Promise((resolve, reject) => {
            producer.send([{
                topic,
                messages: JSON.stringify(esdata),
            }], (err, data) => {
                if (err) return reject(err);
                return resolve(data);
            });
        });
    } catch (err) {
        console.error(err);
    }
}

console.log(`===${config.name} Tracker Started===`);
if (config.debug) console.log("Debug mode on");

http.createServer((req, res) => {
    if (req.url == '/favicon.ico') return;
    if (config.debug) {
        console.log(req.headers);
    }
    if (req.method === "POST" && req.headers["content-type"] === "application/json") {
        post_hit(req, res)
    }
    if (req.method === "GET") {
        get_hit(req, res);
    }
}).listen(port, host, () => {
    if (config.debug) {
        console.log(`RevEngine Tracker listening ${host}:${port}`);
    }
});
