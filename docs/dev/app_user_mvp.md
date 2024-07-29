# RevEngine App User MVP

Goals: 
- Identify the app users from ElasticSearch
- Save that info to the users collection in the database

# App

```bash
node packages/rfv/app_users.js
```

## 1. Identify the app users from ElasticSearch

First page:

GET pageviews_copy/_search
```json
{
  "size": 0,
  "query": {
    "bool": {
      "filter": [
        {
          "match_phrase": {
            "user_agent": "DM Mobile App"
          }
        },
        {
          "range": {
            "time": {
              "format": "strict_date_optional_time",
              "gte": "2024-01-01T09:28:35.649Z",
              "lte": "2024-07-01T00:28:35.649Z"
            }
          }
        }
      ]
    }
  },
  "aggs": {
    "unique_user_ids": {
      "composite": {
        "sources": [
          {
            "user_id": {
              "terms": {
                "field": "user_id"
              }
            }
          }
        ],
        "size": 10000
      }
    }
  }
}
```

Subsequent pages, previous query plus:

```json
{
  "aggs": {
    "unique_user_ids": {
      "composite": {
        "after": { "user_id": "<value_of_last_user_id_from_previous_response>" }
      }
    }
  }
}
```

# 2. Save that info to the users collection in the database

```js
await mongo.updateMany("readers", { "wordpress_id": { "$in": users } }, { "$set": { "app_user": true } });
```