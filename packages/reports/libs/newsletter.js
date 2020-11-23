const config = require("config");
const JXPHelper = require("jxp-helper");
const jxphelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });
require("dotenv").config();
const moment = require("moment-timezone");
moment.tz.setDefault(config.timezone || "UTC");

const sort_obj = obj => {
    return Object.fromEntries(
        Object.entries(obj).sort(([, a], [, b]) => b - a)
    );
}

const addup_obj = (obj, key) => {
    if (obj[key]) {
        obj[key]++
    } else {
        obj[key] = 1;
    }
    return obj;
}

class Newsletter {
    constructor(opts) {
        opts = Object.assign(opts || {}, {
            // Defaults here
        });
    }

    async run(opts) {
        console.log("Running");
        opts = Object.assign({
            start: moment().subtract(2, "day").toDate()
        }, opts);
        let campaigns = (await jxphelper.get("touchbasecampaign", { "filter[sent_date]": `$gte:${moment(opts.start).toISOString()}`, "sort[sent_date]": -1 })).data;
        for (let campaign of campaigns) {
            campaign.clicks = 0;
            campaign.opens = 0;
            campaign.urls = {}
        }
        const aggregate = [
            {
                $addFields: {
                    sd: {
                        $dateFromString: {
                            dateString: moment(opts.start).toISOString()
                        }
                    }
                }
            },
            {
                $match: {
                    $expr: {
                        $gte: [
                            "$timestamp", "$sd"
                        ]
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    campaign_id: 1,
                    url: 1,
                    event: 1,
                    timestamp: 1
                }
            }
            
        ];
        
        const aggregate_result = await jxphelper.aggregate("touchbaseevent", aggregate);
        const total_url_count = {};
        const events = aggregate_result.data;
        // console.log(events.length);
        let total_clicks = 0;
        let total_opens = 0;
        let total_recipients = 0;
        for (let event of events) {
            let campaign = campaigns.find(c => {
                // console.log(event.campaign_id, c._id);
                return event.campaign_id + "" === c._id + "";
            });
            // console.log(campaign, event);
            // break;
            if (!campaign) continue;
            if (event.url) {
                addup_obj(total_url_count, event.url);
                addup_obj(campaign.urls, event.url);
            }
            if (event.event === "opens") {
                campaign.opens++;
                total_opens++;
            } else if (event.event === "clicks") {
                campaign.clicks++;
                total_clicks++;
            }
        }
        campaigns = campaigns.filter(campaign => campaign.clicks || campaign.opens);
        for (let campaign of campaigns) {
            campaign.urls = sort_obj(campaign.urls);
            total_recipients += campaign.total_recipients;
        }
        const totals = {
            urls: sort_obj(total_url_count),
            clicks: total_clicks,
            opens: total_opens,
            total_recipients,
        }
        // console.log(totals);
        return {
            totals,
            campaigns
        };
    }
}

module.exports = Newsletter;