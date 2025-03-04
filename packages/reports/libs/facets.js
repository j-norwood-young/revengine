const config = require("config");
const JXPHelper = require("jxp-helper");
require("dotenv").config();
const jxphelper = new JXPHelper({ server: process.env.API_SERVER || config.api.server, apikey: process.env.APIKEY });
const moment = require("moment-timezone");
moment.tz.setDefault(config.timezone || "UTC");
const esclient = require("@revengine/common/esclient");
const ss = require("simple-statistics");

class Facets {
    quantile(arr, q) {
        const pos = (arr.length - 1) * q; // 90
        const base = Math.floor(pos); // 90
        const rest = pos - base; // 0
        if (arr[base + 1] !== undefined) { // 
            return arr[base] + rest * (arr[base + 1] - arr[base]);
        } else {
            return arr[base];
        }
    };

    async author(author) {
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
                                "exists": {
                                    "field": "user_id"
                                }
                            },
                            {
                                "match": {
                                    "author_id": author
                                }
                            }
                        ],
                        "must_not": [
                            {
                                "match": {
                                    "user_id": 0
                                }
                            }
                        ]
                    }
                },
                "aggs": {
                    "result": {
                        "terms": {
                            "field": "user_id",
                            "size": 1000
                        }
                    }
                }
            }
        }
        const query_result = await esclient.search(query);
        const values = (query_result.aggregations.result.buckets).map(item => item.doc_count).sort((a, b) => a - b);
        const readers = (query_result.aggregations.result.buckets).map(item => {
            return {
                wordpress_id: item.key,
                count: item.doc_count,
                quantile_rank: ss.quantileRankSorted(values, item.doc_count)
            }
        });
        return readers;
    }

    async tag(tag) {
        const query = {
            index: "pageviews_copy",
            body: {
                "size": 1,
                "query": {
                    "bool": {
                        "must": [
                            {
                                "exists": {
                                    "field": "article_id"
                                }
                            },
                            {
                                "exists": {
                                    "field": "user_id"
                                }
                            },
                            {
                                "match": {
                                    "tags": tag
                                }
                            }
                        ],
                        "must_not": [
                            {
                                "match": {
                                    "user_id": 0
                                }
                            }
                        ]
                    }
                },
                "aggs": {
                    "result": {
                        "terms": {
                            "field": "user_id",
                            "size": 3000
                        }
                    }
                }
            }
        }
        const query_result = await esclient.search(query);
        const values = (query_result.aggregations.result.buckets).map(item => item.doc_count).sort((a, b) => a - b);
        const readers = (query_result.aggregations.result.buckets).map(item => {
            return {
                wordpress_id: item.key,
                count: item.doc_count,
                quantile_rank: ss.quantileRankSorted(values, item.doc_count)
            }
        });
        return readers;
    }
}

module.exports = Facets;