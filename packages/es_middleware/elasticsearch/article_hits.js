const EXCLUDE_VALUES = ["adevries", "#Rhodesmustfall"];

module.exports = {
    query: opts => {
        return {
            index: "pageviews",
            body: {
                "size": 1000,
                "query": {
                    "bool": {
                        "must": [
                            {
                                "match": {
                                    "user_id": opts.reader_id
                                }
                            },
                            // {
                            //     "match": {
                            //         "_article": true
                            //     }
                            // },
                            {
                                "range": {
                                    "time": {
                                        "gte": "now-30d/d",
                                        "lt": "now/d",
                                        "time_zone": "+02:00"
                                    }
                                }
                            }
                        ]
                    }
                },
            }
        }
    },
    transform: data => {
        // console.log(data.hits.total);
        const urls = reduce_hit_feature(data, "url");
        const user_agents = reduce_hit_feature(data, "user_agent");
        const referers = reduce_hit_feature(data, "referer");
        const utm_campaigns = reduce_hit_feature(data, "utm_campaign");
        const utm_mediums = reduce_hit_feature(data, "utm_medium");
        const utm_sources = reduce_hit_feature(data, "utm_source");
        const authors = reduce_hit_feature(data, "author_id");
        const devices = reduce_hit_feature(data, "derived_ua_device");
        const oses = reduce_hit_feature(data, "derived_ua_os");
        const os_versions = reduce_hit_feature(data, "derived_ua_os_version");
        const platforms = reduce_hit_feature(data, "derived_ua_platform");
        return { urls, user_agents, referers, utm_campaigns, utm_mediums, utm_sources, authors, devices, oses, os_versions, platforms };
    }
}

const reduce_hit_feature = (data, feature) => {
    return data.hits.hits.reduce((acc, val) => {
        const hit = val._source;
        if (!hit[feature]) return acc;
        if (EXCLUDE_VALUES.indexOf(hit[feature]) !== -1) return acc;
        if (!acc[hit[feature]]) {
            acc[hit[feature]] = 1;
        } else {
            acc[hit[feature]]++
        }
        return acc;
    }, {});
}