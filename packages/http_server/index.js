const config = require("config");
const restify = require("restify");
const server = restify.createServer();
const restler = require("restler-q");
const JXPHelper = require("jxp-helper");
server.use(restify.plugins.authorizationParser());
server.use(restify.plugins.queryParser());

// Set thread pool size to number of CPUs
const OS = require('os')
process.env.UV_THREADPOOL_SIZE = OS.cpus().length

server.use(async (req, res) => {
    try {
        if (!req.authorization?.basic && !req.query?.apikey) {
            res.send(401, "Unauthorized");
            return;
        }
        if (req.query?.apikey) {
            req.apikey = req.query.apikey;
            req.apihelper = new JXPHelper({ server: config.api, apikey: req.query.apikey });
            return;
        }
        const login = await restler.post(`${config.api.server}/login`, { data: { email: req.authorization.basic.username, password: req.authorization.basic.password } });
        req.apikey = login.apikey;
        req.apihelper = new JXPHelper({ server: config.api, apikey: login.apikey });
    } catch (err) {
        console.error(err);
        res.send(401, { error: err });
    }
});

server.get("/test", async (req, res) => {
    try {
        console.log("Got test")
        res.send("Yo");
    } catch (err) {
        console.error(err);
    }
});

module.exports = server;