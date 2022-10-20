# RevEngine Tracker

The Tracker catches hits from a website, enriches the data with additional data, and then sends it to a Kafka queue where it will be picked up by another process and written to a data store like Elasticsearch.

## Required data

The information it needs is:
- An action (always "hit")
- The URL where the hit takes place
- The IP address of the visitor
- The user agent of the visitor
- The referrer of the visitor

## Optional data

Optional information is:
- The visitor's user_id from the refering system (we assume Wordpress)
- The post_id from the refering system (we assume Wordpress)
- UTM data

## Enriched data
Data we add:
- GeoIP data, including country, region, city, latitude, and longitude
- The user agent parsed into browser, browser version, OS, and device type
- UTM data parsed into campaign, source, medium, term, and content
- Article data including title, author, and publication date

## Cookie 

We also store a cookie on the visitor's browser so that we can track repeat visits. This is called the "browser_id" on our side, and the cookie's name is "revengine_browser_id". It is a first-party cookie.

## GET or POST

You would typically use a GET as the src from an image tag or iframe. Iframe is recommended to solve issues with AMP pages. Client-side GET is the most reliable method of sending data to the tracker, as server-side GET or POST tends to fall foul of caching and other issues.

You would use a POST if for some reason you cannot send a GET. A typical use case would be sending a hit from a mobile app. In this case, you will need to manually set the user agent and referrer. You can optionally also set the `user_ip`, `post_id` and `user_id` parameters. Further, you can set the `browser_id` parameter to override the cookie value in the cases where the client doesn't store cookies.

# Sending a GET hit

## Headers
```
Referer https://admin.revengine.dailymaverick.co.za
User-Agent Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36
Cookie revengine_browser_id=1234567890
```

## Query string
http://revengine-tracker.remp.dailymaverick.co.za:3013/?action=hit&post_id=1434629&user_id=1481&utm_source=active%20users&utm_medium=email

## Response
```json
{
    "status": "ok",
    "user_labels": [
        "test",
        "manual-uber-recipients",
        "wordpress-users",
        "wordpress-users-excluding-authors",
        "uber-list",
        "frequency-quartile-1",
        "recency-quartile-1",
        "volume-quartile-1",
        "inactive-subscription"
    ],
    "user_segments": []
}
```

# Sending a POST hit

## Headers

```
Content-Type application/json
```

## Body

```json
{
    "action": "hit",
    "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36",
    "url": "https://www.dailymaverick.co.za/article/2022-10-19-phala-phala-allegations-spark-online-campaign-against-ramaphosa/",
    "referer": "https://www.dailymaverick.co.za/",
    "post_id": 1434629, // optional
    "user_id": 1481, // optional
    "user_ip": "127.0.0.1", // optional
    "browser_id": "1234567890", // optional
}
```

## Response

```json
{
    "status": "ok",
    "user_labels": [
        "test",
        "manual-uber-recipients",
        "wordpress-users",
        "wordpress-users-excluding-authors",
        "uber-list",
        "frequency-quartile-1",
        "recency-quartile-1",
        "volume-quartile-1",
        "inactive-subscription"
    ],
    "user_segments": [],
    "browser_id": "1234567890",
    "user_ip": "85.145.96.231"
}
```