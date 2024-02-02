import request from "supertest";
import { app } from "../event_tracker";
import { KafkaConsumer } from "@revengine/common/kafka";
import { config } from "dotenv";
import { EventTrackerMessage } from "../event_tracker_types";
import esclient from "@revengine/common/esclient";

config();

function generateTestId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

describe("Event Tracker - Stage 1 and 2", () => {
    const test_id = generateTestId();
    it("should send a hit", async () => {
        const res = await request(app)
            .get(`/?action=test&test_id=${test_id}`)
            .set("Accept", "application/json")
            .set("Referer", "https://www.google.com/")
            .set("User-Agent", "Mozilla/5.0 (X11; Linux x86_64; rv:85.0) Gecko/20100101 Firefox/85.0")
        expect(res.statusCode).toEqual(200);
        const json = JSON.parse(res.text);
        expect(json).toHaveProperty("status");
        expect(json.status).toEqual("ok");
        expect(json).toHaveProperty("user_labels");
        expect(json).toHaveProperty("user_segments");
    });
    it("should enrich data", async () => {
        const kafka_server = process.env.KAFKA_SERVER;
        const topic = process.env.TRACKER_KAFKA_TOPIC;
        const consumer = new KafkaConsumer({ kafka_server, topic: `${topic}-test`  });
        const message: EventTrackerMessage = await new Promise(res => {
            consumer.on("message", message => {
                if (message.test_id === test_id) {
                    res(message);
                    consumer.close();
                }
            })
        });
        expect(message).toHaveProperty("action");
        expect(message.action).toEqual("test");
        expect(message).toHaveProperty("url");
        expect(message.url).toEqual("https://www.google.com/");
        expect(message).toHaveProperty("signed_in");
        expect(message.signed_in).toEqual(false);
        expect(message).toHaveProperty("time");
        expect(message).toHaveProperty("user_agent");
        expect(message).toHaveProperty("browser_id");
        expect(message).toHaveProperty("user_labels");
        expect(message).toHaveProperty("user_segments");
        expect(message).toHaveProperty("derived_ua_browser");
        expect(message.derived_ua_browser).toEqual("Firefox");
        expect(message).toHaveProperty("derived_ua_browser_version");
        expect(message.derived_ua_browser_version).toEqual("85.0");
        expect(message).toHaveProperty("derived_ua_device");
        expect(message.derived_ua_device).toEqual("desktop");
        expect(message).toHaveProperty("derived_ua_os");
        expect(message.derived_ua_os).toEqual("Linux");
        expect(message).toHaveProperty("derived_referer_medium");
        expect(message.derived_referer_medium).toEqual("direct");
        expect(message).toHaveProperty("derived_referer_source");
        expect(message.derived_referer_source).toEqual("");
        expect(message).toHaveProperty("sections");
        expect(message.sections).toEqual(null);
        expect(message).toHaveProperty("tags");
        expect(message.tags).toEqual(null);
        expect(message).toHaveProperty("date_published");
        expect(message.date_published).toEqual(null);
        expect(message).toHaveProperty("author_id");
        expect(message.author_id).toEqual(null);
        expect(message).toHaveProperty("user_ip");
    }, 20000);
});

describe("Event Tracker - Stage 3", () => {
    const test_id = generateTestId();
    it("should send a hit", async () => {
        const res = await request(app)
            .get(`/?action=estest&test_id=${test_id}`)
            .set("Accept", "application/json")
            .set("Referer", "https://www.google.com/")
            .set("User-Agent", "Mozilla/5.0 (X11; Linux x86_64; rv:85.0) Gecko/20100101 Firefox/85.0")
        expect(res.statusCode).toEqual(200);
        const json = JSON.parse(res.text);
        expect(json).toHaveProperty("status");
        expect(json.status).toEqual("ok");
        expect(json).toHaveProperty("user_labels");
        expect(json).toHaveProperty("user_segments");
    });
    it("should write to ElasticSearch", async () => {
        await new Promise(res => setTimeout(res, 1000));
        const query = {
            index: process.env.INDEX,
            query: {
                match: {
                    test_id
                }
            }
        }
        // console.log(JSON.stringify(query, null, 2));
        const result = await esclient.search(query)
        // console.log(result.hits.hits[0]);
        expect(result.hits.total.value).toEqual(1);
        expect(result.hits.hits[0]._source).toHaveProperty("test_id");
        expect(result.hits.hits[0]._source.test_id).toEqual(test_id);
        expect(result.hits.hits[0]._source.url).toEqual("https://www.google.com/");
    }, 10000);
});

describe("Event Tracker - POST Data", () => {
    const test_id = generateTestId();
    it("should send a hit", async () => {
        const res = await request(app)
            .post(`/`)
            .set("Accept", "application/json")
            .set("Referer", "https://www.google.com/")
            .set("User-Agent", "Mozilla/5.0 (X11; Linux x86_64; rv:85.0) Gecko/20100101 Firefox/85.0")
            .send({
                action: "test",
                test_id,
                data: {
                    test: "test"
                }
            })
        expect(res.statusCode).toEqual(200);
        const json = JSON.parse(res.text);
        expect(json).toHaveProperty("status");
        expect(json.status).toEqual("ok");
        expect(json).toHaveProperty("user_labels");
        expect(json).toHaveProperty("user_segments");
    });
    it("should enrich data", async () => {
        const kafka_server = process.env.KAFKA_SERVER;
        const topic = process.env.TRACKER_KAFKA_TOPIC;
        const consumer = new KafkaConsumer({ kafka_server, topic: `${topic}-test`  });
        const message: EventTrackerMessage = await new Promise(res => {
            consumer.on("message", message => {
                if (message.test_id === test_id) {
                    res(message);
                    consumer.close();
                }
            })
        });
        expect(message).toHaveProperty("action");
        expect(message.action).toEqual("test");
        expect(message).toHaveProperty("url");
        expect(message.url).toEqual("https://www.google.com/");
        expect(message).toHaveProperty("signed_in");
        expect(message.signed_in).toEqual(false);
        expect(message).toHaveProperty("time");
        expect(message).toHaveProperty("user_agent");
        expect(message).toHaveProperty("browser_id");
        expect(message).toHaveProperty("user_labels");
        expect(message).toHaveProperty("user_segments");
        expect(message).toHaveProperty("derived_ua_browser");
        expect(message.derived_ua_browser).toEqual("Firefox");
        expect(message).toHaveProperty("derived_ua_browser_version");
        expect(message.derived_ua_browser_version).toEqual("85.0");
        expect(message).toHaveProperty("derived_ua_device");
        expect(message.derived_ua_device).toEqual("desktop");
        expect(message).toHaveProperty("derived_ua_os");
        expect(message.derived_ua_os).toEqual("Linux");
        expect(message).toHaveProperty("derived_referer_medium");
        expect(message.derived_referer_medium).toEqual("direct");
        expect(message).toHaveProperty("derived_referer_source");
        expect(message.derived_referer_source).toEqual("");
        expect(message).toHaveProperty("sections");
        expect(message.sections).toEqual(null);
        expect(message).toHaveProperty("tags");
        expect(message.tags).toEqual(null);
        expect(message).toHaveProperty("date_published");
        expect(message.date_published).toEqual(null);
        expect(message).toHaveProperty("author_id");
        expect(message.author_id).toEqual(null);
        expect(message).toHaveProperty("user_ip");
        expect(message).toHaveProperty("data");
        expect(message.data).toHaveProperty("test");
    }, 20000);
});

describe("Event Tracker - POST Data - Stage 3", () => {
    const test_id = generateTestId();
    it("should send a hit", async () => {
        const res = await request(app)
            .post(`/`)
            .set("Accept", "application/json")
            .set("Referer", "https://www.google.com/")
            .set("User-Agent", "Mozilla/5.0 (X11; Linux x86_64; rv:85.0) Gecko/20100101 Firefox/85.0")
            .send({
                action: "estest",
                test_id,
                data: {
                    test: "test"
                }
            })
        expect(res.statusCode).toEqual(200);
        const json = JSON.parse(res.text);
        expect(json).toHaveProperty("status");
        expect(json.status).toEqual("ok");
        expect(json).toHaveProperty("user_labels");
        expect(json).toHaveProperty("user_segments");
    });
    it("should write to ElasticSearch", async () => {
        await new Promise(res => setTimeout(res, 1000));
        const query = {
            index: process.env.INDEX,
            query: {
                match: {
                    test_id
                }
            }
        }
        // console.log(JSON.stringify(query, null, 2));
        const result = await esclient.search(query)
        // console.log(result.hits.hits[0]);
        expect(result.hits.total.value).toEqual(1);
        expect(result.hits.hits[0]._source).toHaveProperty("test_id");
        expect(result.hits.hits[0]._source.test_id).toEqual(test_id);
        expect(result.hits.hits[0]._source.url).toEqual("https://www.google.com/");
        expect(result.hits.hits[0]._source.data).toHaveProperty("test");
    }, 10000);
});

describe("Event Tracker - Missing Post", () => {
    const test_id = generateTestId();
    it("should send a hit", async () => {
        const res = await request(app)
            .post(`/`)
            .set("Accept", "application/json")
            .set("Referer", "https://www.google.com/")
            .set("User-Agent", "Mozilla/5.0 (X11; Linux x86_64; rv:85.0) Gecko/20100101 Firefox/85.0")
            .send({
                action: "test",
                test_id,
                post_id: 1994238,
                data: {
                    test: "test",
                }
            })
        expect(res.statusCode).toEqual(200);
        const json = JSON.parse(res.text);
        expect(json).toHaveProperty("status");
        expect(json.status).toEqual("ok");
        expect(json).toHaveProperty("user_labels");
        expect(json).toHaveProperty("user_segments");
    });
    it("should enrich data with missing article title", async () => {
        const kafka_server = process.env.KAFKA_SERVER;
        const topic = process.env.TRACKER_KAFKA_TOPIC;
        const consumer = new KafkaConsumer({ kafka_server, topic: `${topic}-test`  });
        const message: EventTrackerMessage = await new Promise(res => {
            consumer.on("message", message => {
                if (message.test_id === test_id) {
                    res(message);
                    consumer.close();
                }
            })
        });
        console.log(message);
        expect(message).toHaveProperty("action");
        expect(message.action).toEqual("test");
        expect(message).toHaveProperty("title");
        expect(message.title).toBeTruthy();
    }, 20000);
});