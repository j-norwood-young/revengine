# JXP Helper

A bunch of helpers to make it easier to read, write, delete and do other cool stuff with the [JXP API server](https://github.com/j-norwood-young/jexpress-2)

## Installation

`npm install --save jxp-helper`

## Config

### Config file

Use [config](https://www.npmjs.com/package/config) and create `config/default.json` with your `jxp_server`.

Eg. of `default.json`

```
{
    "jxp_server": "http://localhost:2001"
}
```

### Pass in config

When initialising the helper, just pass in `server`.

```
const JXPHelper = require("jxp_helper");
const apihelper = new JXPHelper({ server: "http://localhost/api" });
```