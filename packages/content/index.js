const config = require("config");
const kafka = require('kafka-node');
const elasticsearch = require("elasticsearch");
const axios = require("axios");

const esclient = new elasticsearch.Client({
    host: config.elasticsearch.server
});

const test = async () => {
    const result = await axios.get(`${config.content.wordpress_api}/posts`)
    console.log(result);
}

test();