import config from "config";
import moment from "moment-timezone";
import esclient from "@revengine/common/esclient.js";
import { quantileRankSorted } from "simple-statistics";

moment.tz.setDefault(config.timezone || "UTC");

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
                quantile_rank: quantileRankSorted(values, item.doc_count)
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
                quantile_rank: quantileRankSorted(values, item.doc_count)
            }
        });
        return readers;
    }
}

export default Facets;