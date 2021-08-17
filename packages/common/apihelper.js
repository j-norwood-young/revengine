const config = require("config");
const JXPHelper = require("jxp-helper");
require("dotenv").config();
const apihelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });

module.exports = apihelper;