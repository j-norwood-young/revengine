const cron = require("node-cron");
const Apihelper = require("jxp-helper");
const config = require("config");
require("dotenv").config();
const nodemailer = require("nodemailer");
const apihelper = new Apihelper({ server: process.env.API_SERVER || config.api.server, apikey: process.env.APIKEY });
const server = require("@revengine/http_server");
const schedule = "* * * * *";
const crypto = require('crypto');
const moment = require("moment-timezone");
const touchbase = require("./touchbase");
moment.tz.setDefault(config.timezone || "UTC");
const { Command } = require("commander");

const mailer_names = [
    "newsletter_content_report",
    "newsletter_management_report",
    "website_content_report",
    "content_report",
]

const mailers = {};
for (mailer_name of mailer_names) {
    mailers[mailer_name] = require(`@revengine/reports/reports/${mailer_name}`);
}

const render = async report => {
    const content = await mailers[report].content();
    return content;
}

const mail = async (report, subject, to, from, params = {}) => {
    try {
        const auth = {};
        if (process.env.SMTP_USER) {
            auth.user = process.env.SMTP_USER;
        }
        if (process.env.SMTP_PASS) {
            auth.pass = process.env.SMTP_PASS;
        }
        const smtp = Object.assign({
            sendmail: true,
            newline: 'unix',
            path: '/usr/sbin/sendmail',
            auth
        }, config.mailer ? config.mailer.smtp : {});
        let transporter = nodemailer.createTransport(smtp);
        let html = await mailers[report].content(params);
        if (!html) throw "Missing contents";
        let info = await transporter.sendMail({
            from: from || config.mailer ? config.mailer.from : "revengine@revengine.dailymaverick.co.za",
            to,
            subject: `${subject || "RevEngine"} - ${moment().format("dddd Do MMMM")}`,
            text: "A RevEngine Report",
            html
        });
        console.log("Message sent: %s", info.messageId);
    } catch (err) {
        console.error(err);
    }
}

let schedules = [];
let hash = "";

const load_schedule = async () => {
    const scheduled_mailers = (await apihelper.get("mailer")).data;
    const newhash = crypto.createHash('md5').update(JSON.stringify(scheduled_mailers)).digest("hex");
    if (newhash !== hash) {
        console.log("Mailer schedule changed");
        hash = newhash;
        while (schedules.length) {
            let schedule = schedules.pop();
            schedule.destroy();
        }
        for (let mailer of scheduled_mailers) {
            let schedule = cron.schedule(mailer.cron, async () => {
                try {
                    await mail(mailer.report, mailer.subject, mailer.emails, null, mailer.params)
                } catch (err) {
                    console.error(err);
                }
            });
            schedules.push(schedule);
        }
        console.log("Mailer Schedules queued:", schedules.length);
    }
};

const scheduler = async () => {
    // await load_schedule();
    cron.schedule(schedule, load_schedule);
    cron.schedule(schedule, mailrun_schedule);
}

server.get("/report/:report", async (req, res) => {
    if (!mailer_names.includes(req.params.report)) return res.send(500, { state: "error", msg: "Report doesn't exist" });
    const query = Object.fromEntries(new URLSearchParams(req.query()))
    let html = await mailers[req.params.report].content(query);
    res.writeHead(200, {
        'Content-Length': Buffer.byteLength(html),
        'Content-Type': 'text/html'
    });
    res.write(html);
    res.end();
})

server.get("/mailer/:mailer_id", async (req, res) => {
    const mailer = (await apihelper.getOne("mailer", req.params.mailer_id)).data;
    try {
        let html = await mailers[mailer.report].content(mailer.params);
        res.writeHead(200, {
            'Content-Length': Buffer.byteLength(html),
            'Content-Type': 'text/html'
        });
        res.write(html);
        res.end();
    } catch (err) {
        console.error(err);
    }
});

const start_http_server = () => {
    server.listen(config.mailer.port || 3017, function () {
        console.log('%s listening at %s', server.name, server.url);
    });
}

const mailrun_schedule = async () => {
    const mailruns = (await apihelper.get("mailrun", { "filter[state]": "due" })).data;
    for (let mailrun of mailruns) {
        if (!mailrun.start_time) continue;
        if (+new Date(mailrun.start_time) > +new Date()) continue;
        touchbase.run_mailrun(mailrun._id);
    }
}

const program = new Command();
program
    .option('-m, --mailer <mailer._id>', 'run for single mailer')
    .option('-s, --server', 'start http server (disables scheduler)')

program.parse(process.argv);
const options = program.opts();

if (require.main === module && !options.mailer) {
    console.log("Loading mailer...");
    if (!options.server) {
        scheduler();
    }
    start_http_server();
}

const send_single_mailer = async (id) => {
    const mailer = (await apihelper.getOne("mailer", id)).data;
    try {
        await mail(mailer.report, mailer.subject, mailer.emails, null, mailer.params)
    } catch (err) {
        console.error(err);
    }
}

if (options.mailer) {
    send_single_mailer(options.mailer);
}

module.exports = { render, mail, mailer_names }