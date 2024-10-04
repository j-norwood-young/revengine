# ElasticSearch Queries and Setup

## Setup

### Create pageviews_depth index

`PUT pageviews_raw`
```json
{ 
    "mappings": {
        "properties": {
            "time": { 
                "type": "date"
            },
            "url": { 
                "properties": {
                    "hash": {
                        "type": "keyword"
                    },
                    "host": {
                        "type": "keyword"
                    },
                    "hostname": {
                        "type": "keyword"
                    },
                    "href": {
                        "type": "keyword"
                    },
                    "origin": {
                        "type": "keyword"
                    },
                    "password": {
                        "type": "keyword"
                    },
                    "pathname": {
                        "type": "keyword"
                    },
                    "port": {
                        "type": "keyword"
                    },
                    "protocol": {
                        "type": "keyword"
                    },
                    "search": {
                        "type": "keyword"
                    },
                    "searchParams": {
                        "type": "object"
                    },
                    "username": {
                        "type": "keyword"
                    }
                }
            },
            "activity": {
                "properties": {
                    "depth": { 
                        "type": "float" 
                    },
                    "time_on_page": { 
                        "type": "integer"
                    },
                    "time_on_page_in_foreground": { 
                        "type": "integer" 
                    },
                    "actions": { 
                        "type": "object" 
                    }
                }
            },
            "article": {
                "properties": {
                    "article_id": { "type": "integer" },
                    "content_type": { "type": "keyword" },
                    "date_published": { "type": "date" },
                    "sections": { "type": "keyword" },
                    "tags": { "type": "keyword" },
                    "headline": { "type": "keyword" },
                    "author": { "type": "keyword" },
                    "sentiment": { "type": "float" },
                    "entities": { "type": "keyword" },
                    "purpose": { "type": "keyword" }
                }
            },
            "user": {
                "properties": {
                    "signed_in": { "type": "boolean" },
                    "user_id": { "type": "integer" },
                    "ip_addr": { "type": "ip" },
                    "browser_id": { "type": "keyword" }
                }
            },
            "screen": {
                "properties": {
                    "width": { "type": "integer" },
                    "height": { "type": "integer" }
                }
            },
            "location": { 
                "properties": {
                    "geo_point": { "type": "geo_point" },
                    "continent_code": { "type": "keyword" },
                    "country_code": { "type": "keyword" },
                    "province": { "type": "keyword" },
                    "city": { "type": "keyword" }
                }
            },
            "user_agent": {
                "type": "keyword",
                "fields": {
                    "device": { "type": "keyword" },
                    "browser":  { "type": "keyword" },
                    "os": { "type": "keyword" },
                    "os_version": { "type": "keyword" },
                    "browser_version": { "type": "keyword"}
                }
            },
            "referer": { 
                "type": "keyword",
                "fields": {
                    "medium": { "type": "keyword" },
                    "source": { "type": "keyword" }
                }
            },
            "utm": {
                "properties": {
                    "id": { "type": "keyword" },
                    "campaign": { "type": "keyword" },
                    "content": { "type": "keyword" },
                    "medium": { "type": "keyword" },
                    "source": { "type": "keyword" },
                    "term": { "type": "keyword" }
                }
            }
        }
    }
}
```

## Users over 10 visits

```JSON
GET pageviews_copy/_search
{
  "size": 0,
  "query": {
    "range": {
      "time": {
        "gte": "now-30d/d",
        "lte": "now/d"
      }
    }
  },
  "aggs": {
    "users_by_count": {
      "terms": {
        "field": "ip_addr",
        "size": 10000
      },
      "aggs": {
        "visit_count": {
          "value_count": {
            "field": "ip_addr"
          }
        }
      }
    },
    "users_with_ten_or_more_visits": {
      "scripted_metric": {
        "init_script": "state.users = []",
        "map_script": """
          if (doc['ip_addr'].size() > 0) {
            state.users.add(doc['ip_addr'].value);
          }
        """,
        "combine_script": """
          state.users;
        """,
        "reduce_script": """
          def count = 0;
          def userVisits = [:];
          for (s in states) {
            for (u in s) {
              if (!userVisits.containsKey(u)) {
                userVisits[u] = 1;
              } else {
                userVisits[u] += 1;
              }
            }
          }
          for (entry in userVisits.entrySet()) {
            if (entry.getValue() >= 10) {
              count += 1;
            }
          }
          return count;
        """
      }
    }
  }
}
```

## Pageviews by IP using Rollup Index
```JSON
GET pageviews_ip_rollup/_search
{
  "size": 0,
  "query": {
    "range": {
      "time.date_histogram.timestamp": {
        "gte": "now-12M/M",
        "lte": "now-1M/M"
      }
    }
  },
  "aggs": {
    "monthly_breakdown": {
      "date_histogram": {
        "field": "time.date_histogram.timestamp",
        "calendar_interval": "month",
        "format": "MMMM yyyy",
        "min_doc_count": 0,
        "extended_bounds": {
          "min": "now-3M/M",
          "max": "now/M"
        }
      },
      "aggs": {
        "ip_count_ranges": {
          "range": {
            "field": "user_ip.keyword.terms._count",
            "ranges": [
              { "to": 2, "key": "equal_to_one" },
              { "from": 2, "to": 15, "key": "between_two_and_fourteen" },
              { "from": 15, "key": "fifteen_or_more" }
            ]
          }
        }
      }
    }
  }
}
```