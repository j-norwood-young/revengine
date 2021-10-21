const config = require("config");
const puppeteer = require('puppeteer');
require("dotenv").config();

const content = async (params = {}) => {
    try {
        if (!params.scheduled_report_id) return "?scheduled_report_id=<scheduled_report_id> required";
        const fname = `/tmp/${params.scheduled_report_id}.pdf`
        const url = `${config.frontend.url}report/editorial_dashboard_mail?scheduled_report_id=${params.scheduled_report_id}&mail_view=1&apikey=${process.env.APIKEY}&user_id=${process.env.USER_ID}`
        console.log(url)
        const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
        const page = await browser.newPage();
        await page.goto(url)
        await page.waitForNetworkIdle();
        await page.pdf({ path: fname });
        return "PDF generated";
    } catch(err) {
        console.error(err);
        return JSON.stringify(err)
    }
}

module.exports = { content }