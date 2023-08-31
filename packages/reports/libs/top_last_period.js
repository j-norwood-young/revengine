const config = require("config");
require("dotenv").config();
const moment = require("moment-timezone");
moment.tz.setDefault(config.timezone || "UTC");
const esclient = require("@revengine/common/esclient");

class TopLastPeriod {
    async run(opts) {
        try {
            // const periods = {
            //     hour: "now-1h/h",
            //     day: "now-1d/d",
            //     week: "now-7d/d",
            //     month: "now-30d/d",
            //     // sixmonth: "now-6M/M",
            //     // year: "now-1y/y",
            // }
            opts = Object.assign({
                size: 40,
                article_id: null,
                section: null,
                author: null,
                tag: null,
                start_period: "week",
                end_period: "now",
            }, opts);
            // if (!periods[opts.period]) throw `Unknown period. Choose from ${ Object.keys(periods).join(", ")}`;
            const size = Number(opts.size) + 2;
            if (config.debug) {
                console.log({opts});
            }
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
                                            "lt": opts.end_period,
                                            "gte": opts.start_period,
                                        }
                                    }
                                },
                                {
                                    "exists": {
                                        "field": "article_id"
                                    }
                                },
                            ],
                            "must": [],
                            "should": [],
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
                const exclude_sections = opts.exclude_section.split(",").map(s => s.trim());
                exclude_sections.forEach(exclude_section => {
                    query.body.query.bool.must_not.push({
                        "match": {
                            "sections": {
                                "query": exclude_section,
                                "operator": "and"
                            }
                        }
                    })
                });
            }
            if (opts.exclude_tag) {
                const tags = opts.exclude_tag.split(",").map(s => s.trim());
                tags.forEach(tag => {
                    query.body.query.bool.must_not.push({
                        "match": {
                            "tags": {
                                "query": tag,
                                "operator": "and"
                            }
                        }
                    })
                });
            }
            if (opts.exclude_author) {
                const authors = opts.exclude_author.split(",").map(s => s.trim());
                authors.forEach(author => {
                    query.body.query.bool.must_not.push({
                        "term": {
                            "author_id": author
                        }
                    })
                });
            }
            if (opts.exclude_content_type) {
                const content_types = opts.exclude_content_type.split(",").map(s => s.trim());
                content_types.forEach(content_type => {
                    query.body.query.bool.must_not.push({
                        "term": {
                            "content_type": content_type
                        }
                    })
                });
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
            if (opts.signed_in) {
                query.body.query.bool.filter.push({
                    "term": {
                        "signed_in": true
                    }
                })
            }
            if (config.debug) {
                console.log(JSON.stringify(query, null, "  "));
            }
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