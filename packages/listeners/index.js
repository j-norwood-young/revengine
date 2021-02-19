const config = require("config");
const restify = require("restify");
const public_server = restify.createServer({
    name: config.api_name
});

public_server.use(restify.plugins.bodyParser()); 
public_server.use(restify.plugins.queryParser()); 
const touchbase = require("@revengine/mailer/touchbase");

// const woocommerce = require("./woocommerce");

public_server.post("/woocommerce/subscriptions/callback", touchbase.woocommerce_subscriptions_callback);
public_server.post("/woocommerce/subscriptions/zapier/callback", touchbase.woocommerce_subscriptions_zapier_callback);
public_server.get("/email/automated/monthly_uber_mail", touchbase.monthly_uber_mail);

public_server.listen(config.listeners.public_port || 3020, function () {
    console.log('%s listening at %s', public_server.name, public_server.url);
});

const protected_server = require("@revengine/http_server");
protected_server.listen(config.listeners.protected_port || 3021, function () {
    console.log('%s listening at %s', protected_server.name, protected_server.url);
});