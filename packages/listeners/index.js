const config = require("config");
const restify = require("restify");
const public_server = restify.createServer({
    name: config.api_name
});

public_server.use(restify.plugins.bodyParser()); 
public_server.use(restify.plugins.queryParser()); 
const touchbase = require("@revengine/mailer/touchbase");
const ml = require("@revengine/ml");

// const woocommerce = require("./woocommerce");

public_server.post("/woocommerce/subscriptions/callback", touchbase.woocommerce_subscriptions_callback);
public_server.post("/woocommerce/subscriptions/zapier/callback", touchbase.woocommerce_subscriptions_zapier_callback);

public_server.post("/ml/prediction_dump", ml.prediction_dump);

public_server.listen(config.listeners.public_port || 3020, function () {
    console.log('%s listening at %s', public_server.name, public_server.url);
});

const protected_server = require("@revengine/http_server");

protected_server.get("/email/mailrun/:mailrun_id", async (req, res) => {
    try {
        const result = await touchbase.run_mailrun(req.params.mailrun_id);
        res.send(result);
    } catch(err) {
        res.status(500).send({ error: err.toString() });
    }
});

protected_server.get("/email/automated/monthly_uber_mail", touchbase.monthly_uber_mail);

protected_server.listen(config.listeners.protected_port || 3021, function () {
    console.log('%s listening at %s', protected_server.name, protected_server.url);
});