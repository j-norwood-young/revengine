const config = require("config");
require("dotenv").config();
const nodemailer = require("nodemailer");
const pug = require("pug");
const fs = require("fs").promises;
const path = require("path");
const http = require("http");
const JXPHelper = require("jxp-helper");
const jxphelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });
const moment = require("moment");

const main = async () => {
    const smtp = Object.assign({
        auth: {
            user: process.env.MAILUSER,
            pass: process.env.MAILPASS,
        }
    }, config.mailer.smtp);
    let transporter = nodemailer.createTransport(smtp);

    // let html = await daily_churn();
    // console.log(html);
    // let info = await transporter.sendMail({
    //     from: config.mailer.from,
    //     to: config.mailer.to,
    //     subject: "Daily Churn",
    //     text: "A Revengine Report",
    //     html
    // });

    // console.log("Message sent: %s", info.messageId);
}

const daily_churn = async () => {
    try {
        console.log( moment().subtract(1, "day").startOf("day").format("YYYY-MM-DD") );
        const subscriptions = (await jxphelper.get("woocommerce_subscription", { "sort[date_created]": -1, limit: 1000, "filter[date_created]": `$gte: ${moment().subtract(1, "day").startOf("day").format("YYYY-MM-DD")}` })).data;
        console.log(subscriptions);
        const template = pug.compileFile(path.join(__dirname, "./templates/daily_churn.pug"));
        return template({ subscriptions });
    } catch(err) {
        console.error(err);
        return "";
    }
}

main().catch(console.error);
http.createServer(async (req, res) => {
    const s = await daily_churn();
    res.setHeader('Content-type', 'text/html');
    res.end(s);
}).listen(config.mailer.port || 3017)