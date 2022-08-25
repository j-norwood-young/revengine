# Protected APIs

## Protected API URL

https://protected.revengine.dailymaverick.co.za

## Authentication

Basic Auth

API key

`https://protected.revengine.dailymaverick.co.za/{endpoint}?apikey={api_key}`

## Endpoints

### GET /autogen_newsletter

#### Parameters

?sections={section 1},{section 2}

### GET /email/automated/monthly_uber_mail

### GET /report/logged_in_users

#### Parameters

?period={period}

### GET /report/users_by_utm_source

#### Parameters

?period={period}&utm_source={utm_source}

### GET /report/users_by_label

?period={period}&label={label}

### GET /report/users_by_segment

?period={period}&segment={segment}

## Period parameter

#### Valid period options
hour
day
week
month
threemonth
sixmonth
year

#### Default
week