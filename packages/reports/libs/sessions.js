const config = require("config");
const JXPHelper = require("jxp-helper");
require("dotenv").config();
const jxphelper = new JXPHelper({ server: process.env.API_SERVER || config.api.server, apikey: process.env.APIKEY });
const moment = require("moment-timezone");
moment.tz.setDefault(config.timezone || "UTC");
const esclient = require("@revengine/common/esclient");

const es_period_filter = require("./es_period_filter");

class Sessions {
    constructor(start_date, end_date) {
        this.start_date = start_date || moment().subtract(1, "days").toISOString();
        this.end_date = end_date || moment().subtract(0, "days").toISOString();
    }

    async get_logged_in_hits() {
        const query = {
            index: "pageviews_copy",
            track_total_hits: true,
            body: {
                "size": 0,
                "query": {
                    "bool": {
                        "filter": [
                            {
                                "match_phrase": {
                                    "signed_in": true
                                }
                            },
                            {
                                "range": {
                                    "time": {
                                        // "format": "strict_date_optional_time",
                                        "gte": moment(this.start_date).format("YYYY-MM-DDTHH:mm:ss.SSSZ"),
                                        "lte": moment(this.end_date).format("YYYY-MM-DDTHH:mm:ss.SSSZ")
                                    }
                                }
                            }
                        ],
                    }
                },
                "aggs": {
                    "days": {
                        "date_histogram": {
                            "field": "time",
                            "calendar_interval": "1d",
                            "time_zone": "Africa/Johannesburg",
                            "min_doc_count": 1
                        }
                    },

                },
            }
        }
        const es_result = await esclient.search(query);
        return {
            start_date: moment(this.start_date).toISOString(),
            end_date: moment(this.end_date).toISOString(),
            total: es_result.hits.total.value,

        };
    }

    async get_logged_in_users(period = "week") {
        let query = {
            index: "pageviews_copy",
            track_total_hits: true,
            body: {
                "size": 0,
                "query": {
                    "bool": {
                        "filter": [
                            {
                                "match_phrase": {
                                    "signed_in": true
                                }
                            }
                        ],
                    }
                },
                "aggs": {
                    "days": {
                        "date_histogram": {
                            "field": "time",
                            "calendar_interval": "1d",
                            "time_zone": "Africa/Johannesburg",
                            "min_doc_count": 1
                        },
                        "aggs": {
                            "user_id": {
                                "cardinality": {
                                    "field": "user_id"
                                },
                            }
                        }
                    },

                },
            }
        }
        query = es_period_filter(query, period);
        const es_result = await esclient.search(query);
        // console.log(JSON.stringify(query, null, 2));
        return {
            type: "logged_in_users",
            period,
            total: es_result.hits.total.value,
            data: es_result.aggregations.days.buckets.map(bucket => {
                return {
                    date: bucket.key_as_string,
                    user_count: bucket.user_id.value,
                    hit_count: bucket.doc_count,
                }
            }),
        };
    }

    async get_users_by_utm_source(utm_source, period = "week") {
        let query = {
            index: "pageviews_copy",
            track_total_hits: true,
            body: {
                "size": 0,
                "query": {
                    "bool": {
                        "filter": [
                            {
                                "match_phrase": {
                                    "utm_source": utm_source
                                }
                            }
                        ],
                    }
                },
                "aggs": {
                    "days": {
                        "date_histogram": {
                            "field": "time",
                            "calendar_interval": "1d",
                            "time_zone": "Africa/Johannesburg",
                            "min_doc_count": 1
                        },
                        "aggs": {
                            "user_id": {
                                "cardinality": {
                                    "field": "user_id"
                                },
                            }
                        }
                    },

                },
            }
        }
        query = es_period_filter(query, period);
        const es_result = await esclient.search(query);
        // console.log(JSON.stringify(query, null, 2));
        return {
            type: "users_by_utm_source",
            utm_source,
            period,
            total: es_result.hits.total.value,
            data: es_result.aggregations.days.buckets.map(bucket => {
                return {
                    date: bucket.key_as_string,
                    user_count: bucket.user_id.value,
                    hit_count: bucket.doc_count,
                }
            }),
        };
    }

    async get_users_by_label(label, period = "week") {
        let query = {
            index: "pageviews_copy",
            track_total_hits: true,
            body: {
                "size": 0,
                "query": {
                    "bool": {
                        "filter": [
                            {
                                "match_phrase": {
                                    "labels": label
                                }
                            }
                        ],
                    }
                },
                "aggs": {
                    "days": {
                        "date_histogram": {
                            "field": "time",
                            "calendar_interval": "1d",
                            "time_zone": "Africa/Johannesburg",
                            "min_doc_count": 1
                        },
                        "aggs": {
                            "user_id": {
                                "cardinality": {
                                    "field": "user_id"
                                },
                            }
                        }
                    },

                },
            }
        }
        query = es_period_filter(query, period);
        const es_result = await esclient.search(query);
        // console.log(JSON.stringify(query, null, 2));
        return {
            type: "users_by_label",
            label,
            period,
            total: es_result.hits.total.value,
            data: es_result.aggregations.days.buckets.map(bucket => {
                return {
                    date: bucket.key_as_string,
                    user_count: bucket.user_id.value,
                    hit_count: bucket.doc_count,
                }
            }),
        };
    }

    async get_users_by_segment(segment, period = "week") {
        let query = {
            index: "pageviews_copy",
            track_total_hits: true,
            body: {
                "size": 0,
                "query": {
                    "bool": {
                        "filter": [
                            {
                                "match_phrase": {
                                    "segments": segment
                                }
                            }
                        ],
                    }
                },
                "aggs": {
                    "days": {
                        "date_histogram": {
                            "field": "time",
                            "calendar_interval": "1d",
                            "time_zone": "Africa/Johannesburg",
                            "min_doc_count": 1
                        },
                        "aggs": {
                            "user_id": {
                                "cardinality": {
                                    "field": "user_id"
                                },
                            }
                        }
                    },

                },
            }
        }
        query = es_period_filter(query, period);
        const es_result = await esclient.search(query);
        // console.log(JSON.stringify(query, null, 2));
        return {
            type: "users_by_segment",
            segment,
            period,
            total: es_result.hits.total.value,
            data: es_result.aggregations.days.buckets.map(bucket => {
                return {
                    date: bucket.key_as_string,
                    user_count: bucket.user_id.value,
                    hit_count: bucket.doc_count,
                }
            }),
        };
    }

}

module.exports = Sessions;