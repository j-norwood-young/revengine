const config = require("config");
const restify = require("restify");
const server = restify.createServer();
const restler = require("restler-q");
const JXPHelper = require("jxp-helper");
server.use(restify.plugins.authorizationParser());
server.use(restify.plugins.queryParser());

server.use(async (req, res, next) => {
    try {
        if (!req.authorization?.basic && !req.query?.apikey) {
            res.send(401, "Unauthorized");
            return;
        }
        if (req.query?.apikey) {
            req.apikey = req.query.apikey;
            req.apihelper = new JXPHelper({ server: config.api, apikey: req.query.apikey });
            return next();
        }
        const login = await restler.post(`${config.api.server}/login`, { data: { email: req.authorization.basic.username, password: req.authorization.basic.password } });
        req.apikey = login.apikey;
        console.log(login);
        req.apihelper = new JXPHelper({ server: config.api, apikey: login.apikey });
        next();
    } catch (err) {
        console.error(err);
        res.send(401, { error: err });
    }
});

server.get("/test", async (req, res, next) => {
    try {
        console.log("Got test")
        res.send("Yo");
        next();
    } catch (err) {
        console.error(err);
    }
});

module.exports = server;