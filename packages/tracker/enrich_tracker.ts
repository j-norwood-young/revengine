import { EventTrackerMessage } from "./event_tracker_types";
const parse_user_agent = require("./user_agent").parse_user_agent;
const geolocate_ip = require("./geolocate_ip").geolocate_ip;
const parse_referer = require("./referer").parse_referer;
const parse_utm = require("./utm").parse_utm;
const get_article_data = require("./article").get_article_data;

export async function enrich_tracker(message: EventTrackerMessage) {
    if (message.user_id === 0) {
        message.user_id = null;
    }
    const result = Object.assign(
        {
            index: message.index,
            action: message.action || "hit",
            article_id: message.post_id,
            referer: message.referer,
            url: message.url,
            signed_in: !!message.user_id,
            time: new Date(),
            user_agent: message.user_agent,
            user_id: message.user_id,
            browser_id: message.browser_id,
            content_type: message.post_type,
            user_labels: message.user_labels,
            user_segments: message.user_segments,
            test_id: message.test_id,
        },
        parse_user_agent(message.user_agent),
        await geolocate_ip(message.user_ip),
        parse_referer(message.referer, message.url),
        parse_utm(message.url),
        await get_article_data(message.post_id),
    );
    if (message.user_ip) result.user_ip = message.user_ip;
    return result;
};