# dm-insiders
A user journey system for Daily Maverick

## Setting up

```
npm install
mkdir config
pico config/default.json
```

### config/default.json

```json
{
    "api": {
        "url": "http://localhost:2001",
        "email": "blah@blah.com",
        "password": "password"
    },
    "elasticsearch": {
        "host": "localhost:9200"
    },
    "mysql": {
        "host": "localhost",
        "user": "blah",
        "password": "blah",
        "database": "crm"
    },
    "jxp_server": "http://localhost:2001",
    "apikey": "blah",
    "touchbase": {
        "client_id": "abc123",
        "api_secret": "abc123",
        "primary_list": "abc123"
    },
    "woocommerce": {
        "consumer_key": "ck_abc123",
        "consumer_secret": "cs_abc123"
    }
}
```