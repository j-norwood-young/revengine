import config from "config";
import JXPHelper from "jxp-helper";
import dotenv from "dotenv";
dotenv.config();
const apihelper = new JXPHelper({ server: process.env.API_SERVER || config.api.server, apikey: process.env.APIKEY });

export default apihelper;