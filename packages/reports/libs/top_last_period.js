const config = require("config");
require("dotenv").config();
const moment = require("moment-timezone");
moment.tz.setDefault(config.timezone || "UTC");
const elasticsearch = require("elasticsearch")
const esclient = new elasticsearch.Client({
    host: config.elasticsearch.server,
});

class TopLastPeriod {
    async run(opts) {
        try {
            const periods = {
                day: "now-1d/d",
                week: "now-1w/w",
                month: "now-1M/M",
                // sixmonth: "now-6M/M",
                // year: "now-1y/y",
            }
            opts = Object.assign({
                size: 40,
                article_id: null,
                section: null,
                period: "week"
            }, opts);
            if (!periods[opts.period]) throw `Unknown period. Choose from ${ Object.keys(periods).join(", ")}`;
            const size = opts.size + 2;
            console.log(periods[opts.period]);
            const query = {
                index: "pageviews_copy",
                body: {
                    "size": 0,
                    "query": {
                        "bool": {
                            "must": [
                                {
                                    "exists": {
                                        "field": "article_id"
                                    }
                                },
                                {
                                    "range": {
                                        "time": {
                                            "lt": "now",
                                            "gte": periods[opts.period],
                                            // "time_zone": "+02:00"
                                        }
                                    }
                                }
                            ]
                        }
                    },
                    "aggs": {
                        "result": {
                            "terms": {
                                "field": "article_id",
                                "size": size,
                            }
                        }
                    }
                }
            }
            if (opts.article_id) {
                query.body.query.bool.must.push({
                    "match": {
                        article_id: opts.article_id
                    }
                })
            }
            if (opts.section) {
                query.body.query.bool.must.push({
                    "match": {
                        sections: opts.section
                    }
                })
            }
            const result = (await esclient.search(query)).aggregations.result.buckets.sort((a, b) => b.doc_count - a.doc_count).slice(0, size - 1);
            console.log(result);
            return result;
        } catch(err) {
            return Promise.reject(err);
        }
    }
}

module.exports = TopLastPeriod;