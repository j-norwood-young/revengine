import { EventTrackerMessage } from "./event_tracker_types";
import { parse_user_agent } from "./user_agent";
import { geolocate_ip } from "./geolocate_ip";
import { parse_referer } from "./referer";
import { parse_utm } from "./utm";
import { get_article_data } from "./article";

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
            user_id: Number(message.user_id),
            browser_id: message.browser_id,
            content_type: message.post_type,
            user_labels: message.user_labels,
            user_segments: message.user_segments,
            test_id: message.test_id,
            data: message.data,
            seconds_on_page: Math.round(message.seconds_on_page || 0),
            scroll_depth: Math.round(message.scroll_depth || 0),
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