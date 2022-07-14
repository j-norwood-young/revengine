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