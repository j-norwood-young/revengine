import config from "config";
import puppeteer from 'puppeteer';
import dotenv from "dotenv";
dotenv.config();
import pug from "pug";
import path from "path";
import moment from "moment";
const numberFormat = new Intl.NumberFormat(config.locale || "en-GB", { maximumFractionDigits: 1 });

const content = async (params = {}) => {
    let browser;
    try {
        if (!params.scheduled_report_id) return "?scheduled_report_id=<scheduled_report_id> required";
        const fname = `/tmp/${params.scheduled_report_id}.pdf`
        const url = `${config.frontend.url}report/editorial_dashboard_mail?scheduled_report_id=${params.scheduled_report_id}&mail_view=1&apikey=${process.env.APIKEY}&user_id=${process.env.USER_ID}`
        // console.log(url)
        browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
        const page = await browser.newPage();
        await page.goto(url)
        await page.waitForSelector("#load_report");
        await page.click("#load_report");
        await page.waitForSelector("#loaded");
        const content = await page.$eval("#container", el => el.outerHTML);
        await page.close();
        await browser.close();
        const template = pug.compileFile(path.join(__dirname, "../templates/simple_layout.pug"));
        // return content;
        return template({ content, moment, numberFormat })
    } catch(err) {
        if (browser) browser.close();
        console.error(err);
        return JSON.stringify(err)
    }
}

export { content }