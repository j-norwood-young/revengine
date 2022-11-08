const config = require("config");
const dotenv = require("dotenv");
dotenv.config();
const elasticsearch = require("@elastic/elasticsearch");

const es_config = Object.assign(config.elasticsearch, {
    auth: {
        username: process.env.ES_USER,
        password: process.env.ES_PASSWORD,
    }
});
const esclient = new elasticsearch.Client(es_config);

module.exports = esclient;