const config = require("config");
const restify = require("restify");
const server = restify.createServer({
    name: config.api_name
});
server.use(restify.plugins.bodyParser()); 
server.use(restify.plugins.queryParser()); 
const touchbase = require("@revengine/mailer/touchbase");

// const woocommerce = require("./woocommerce");

server.post("/woocommerce/subscriptions/callback", touchbase.woocommerce_subscriptions_callback);
server.post("/woocommerce/subscriptions/zapier/callback", touchbase.woocommerce_subscriptions_zapier_callback);
server.get("/email/automated/monthly_uber_mail", touchbase.monthly_uber_mail);

server.listen(config.listeners.port || 3020, function () {
    console.log('%s listening at %s', server.name, server.url);
});