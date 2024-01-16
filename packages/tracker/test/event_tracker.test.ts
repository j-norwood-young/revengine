const request = require("supertest");
const app = require("../event_tracker.ts");
const KafkaConsumer = require("@revengine/common/kafka").KafkaConsumer;
const dotenv = require("dotenv");
dotenv.config();


describe("Event Tracker", () => {
    it("should respond with ok", async () => {
        const res = await request(app)
        .get("/?action=test")
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
});

describe("Kafka Consumer", () => {
    it("should consume messages", async () => {
        const kafka_server = process.env.KAFKA_SERVER;
        const topic = process.env.TRACKER_KAFKA_TOPIC;
        const consumer = new KafkaConsumer({ kafka_server, topic  });
        const messages = await new Promise(res => {
            consumer.on("message", message => {
                console.log({message});
                res(message);
            })
        });
        // [
        //     {
        //       topic: 'event_tracker_test',
        //       messages: '{"index":"pageviews_test","action":"test","url":"https://www.google.com/","signed_in":false,"time":"2024-01-16T15:07:05.096Z","user_agent":"Mozilla/5.0 (X11; Linux x86_64; rv:85.0) Gecko/20100101 Firefox/85.0","browser_id":"5e546cb5f014cf2bb0ec5baa5ed5befe75ac60ec","user_labels":[],"user_segments":[],"derived_ua_browser":"Firefox","derived_ua_browser_version":"85.0","derived_ua_device":"desktop","derived_ua_os":"Linux","derived_referer_medium":"direct","derived_referer_source":"","sections":null,"tags":null,"date_published":null,"author_id":null,"user_ip":"::ffff:127.0.0.1"}'
        //     }
        //   ]
        expect(messages[0].topic).toEqual(topic);
        expect(messages[0]).toHaveProperty("message");
        const json = JSON.parse(messages[0].message);
        expect(json).toHaveProperty("action");
        expect(json.action).toEqual("test");
        expect(json).toHaveProperty("url");
        expect(json.url).toEqual("https://www.google.com/");
        expect(json).toHaveProperty("signed_in");
        expect(json.signed_in).toEqual(false);
        expect(json).toHaveProperty("time");
        expect(json).toHaveProperty("user_agent");
        expect(json).toHaveProperty("browser_id");
        expect(json).toHaveProperty("user_labels");
        expect(json).toHaveProperty("user_segments");
        expect(json).toHaveProperty("derived_ua_browser");
        expect(json.derived_ua_browser).toEqual("Firefox");
        expect(json).toHaveProperty("derived_ua_browser_version");
        expect(json.derived_ua_browser_version).toEqual("85.0");
        expect(json).toHaveProperty("derived_ua_device");
        expect(json.derived_ua_device).toEqual("desktop");
        expect(json).toHaveProperty("derived_ua_os");
        expect(json.derived_ua_os).toEqual("Linux");
        expect(json).toHaveProperty("derived_referer_medium");
        expect(json.derived_referer_medium).toEqual("direct");
        expect(json).toHaveProperty("derived_referer_source");
        expect(json.derived_referer_source).toEqual("");
        expect(json).toHaveProperty("sections");
        expect(json.sections).toEqual(null);
        expect(json).toHaveProperty("tags");
        expect(json.tags).toEqual(null);
        expect(json).toHaveProperty("date_published");
        expect(json.date_published).toEqual(null);
        expect(json).toHaveProperty("author_id");
        expect(json.author_id).toEqual(null);
        expect(json).toHaveProperty("user_ip");
    });
});