const config = require("config");
require("dotenv").config();
const moment = require("moment-timezone");
moment.tz.setDefault(config.timezone || "UTC");
const esclient = require("@revengine/common/esclient");

class TopLastPeriod {
    async run(opts) {
        try {
            const periods = {
                hour: "now-1h/h",
                day: "now-1d/d",
                week: "now-7d/d",
                month: "now-30d/d",
                // sixmonth: "now-6M/M",
                // year: "now-1y/y",
            }
            opts = Object.assign({
                size: 40,
                article_id: null,
                section: null,
                author: null,
                tag: null,
                period: "week",
            }, opts);
            if (!periods[opts.period]) throw `Unknown period. Choose from ${ Object.keys(periods).join(", ")}`;
            const size = Number(opts.size) + 2;
            // console.log(opts);
            const query = {
                index: "pageviews_copy",
                body: {
                    "size": 0,
                    "query": {
                        "bool": {
                            "must_not": [],
                            "filter": [
                                {
                                    "range": {
                                        "time": {
                                            "lt": "now",
                                            "gte": periods[opts.period],
                                        }
                                    }
                                },
                                {
                                    "exists": {
                                        "field": "article_id"
                                    }
                                },
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
                query.body.query.bool.filter.push({
                    "match": {
                        article_id: opts.article_id
                    }
                })
            }
            if (opts.author) {
                query.body.query.bool.filter.push({
                    "term": {
                        "author_id": opts.author
                    }
                })
            }
            if (opts.content_type) {
                query.body.query.bool.filter.push({
                    "term": {
                        "content_type": opts.content_type
                    }
                })
            }
            if (opts.tag) {
                query.body.query.bool.filter.push({
                    "match": {
                        tags: {
                            "query": opts.tag,
                            "operator": "and"
                        }
                    }
                })
            }
            if (opts.section) {
                query.body.query.bool.filter.push({
                    "match": {
                        "sections": {
                            "query": opts.section,
                            "operator": "and"
                        }
                    }
                })
            }
            if (opts.exclude_section) {
                query.body.query.bool.must_not.push({
                    "match": {
                        "sections": {
                            "query": opts.exclude_section,
                            "operator": "and"
                        }
                    }
                })
            }
            if (opts.published_date_gte) {
                query.body.query.bool.filter.push({
                    "range": {
                        "date_published": {
                            "gte": moment(opts.published_date_gte).toISOString()
                        }
                    }
                })
            }
            // console.log(JSON.stringify(query, null, "  "));
            const esresult = await esclient.search(query)
            const result = esresult.aggregations.result.buckets.sort((a, b) => b.doc_count - a.doc_count);
            // console.log(JSON.stringify(esresult, null, "  "));
            return result;
        } catch(err) {
            return Promise.reject(err);
        }
    }
}

module.exports = TopLastPeriod;