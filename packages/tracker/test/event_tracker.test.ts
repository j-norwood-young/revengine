import request from "supertest";
import { app } from "../event_tracker";
import { KafkaConsumer } from "@revengine/common/kafka";
import { config } from "dotenv";
import { EventTrackerMessage } from "../event_tracker_types";
config();


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
        const consumer = new KafkaConsumer({ kafka_server, topic: `${topic}-2`  });
        const message: EventTrackerMessage = await new Promise(res => {
            consumer.on("message", message => {
                console.log({message});
                res(message);
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