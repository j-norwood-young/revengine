import express from 'express';
const router = express.Router();
import config from "config";
import JXPHelper from "jxp-helper";
import dotenv from "dotenv";
dotenv.config();

import loginRouter from "./login.js";
router.use("/login", loginRouter);

/* Login */
router.use(async (req, res, next) => {
	res.locals.sitename = config.name
	if (!req.body.login) return next();
	try {
		const apihelper = new JXPHelper({ server: process.env.API_SERVER || config.api.server, apikey: process.env.APIKEY });
		// console.log({ server: process.env.API_SERVER || config.api.server, apikey: process.env.APIKEY });
		let login_data = await apihelper.login(req.body.email, req.body.password);
		if (login_data.status === "fail") {
			res.render('login', { title: 'Login', "msg": "Incorrect username or password" });
			return;
		}
		if (login_data.status === "error") {
			res.render('login', { title: 'Login', "msg": login_data.message });
			return;
		}
		req.session.apikey = login_data.data.apikey;
		req.session.user = login_data.user;
		res.redirect("/");
	} catch (err) {
		console.error(err);
		res.render('login', { title: 'Login', "msg": err.msg || "An unknown error occured" });
		return;
	}
	// next();
});

router.use((req, res, next) => {
	res.locals.query = Object.fromEntries(new URLSearchParams(req.query()))
	next();
})

router.use((req, res, next) => {
	res.locals.dev = process.env.NODE_ENV === "development";
	next();
})

/* Log in from Wordpress */
router.use(async (req, res, next) => {
	if (res.locals.query.apikey) {
		req.session.apikey = res.locals.query.apikey;
		try {
			if (!res.locals.query.user_id) {
				throw ("Missing user_id");
			}
			const user_id = res.locals.query.user_id;
			const user_apihelper = new JXPHelper({ server: process.env.API_SERVER || config.api.server, apikey: req.session.apikey });
			req.session.user = await user_apihelper.getOne("user", user_id);
			next();
		} catch (err) {
			res.status(400).send({ error: err });
		}
	} else {
		next();
	}
})

router.use((req, res, next) => {
	if (!req.session.apikey) {
		res.render("login", { title: "Login" });
		return;
	}
	next();
});

/* State Variables */
router.use(async (req, res, next) => {
	const { default: Reader } = await import("../src/javascripts/typedefs/reader.js");
	const reader = new Reader();
	res.locals.typedefs = { reader };
	res.locals.sitename = config.frontend.sitename;
	res.locals.user = req.session.user;
	res.locals.apikey = req.session.apikey;
	res.locals.apiserver = config.api.server;
	res.locals.pipelineserver = config.pipeline.server;
	// res.locals.daemonserver = config.daemon_api.url;
	req.apihelper = new JXPHelper({ server: process.env.API_SERVER || config.api.server, apikey: req.session.apikey });
	next();
})

/* Useful shit */
router.use(async (req, res, next) => {
	const moment = (await import("moment-timezone")).default;
	const formatNumber = (await import("../libs/formatNumber.js")).default;
	res.locals.moment = moment;
	res.locals.formatNumber = formatNumber;
	next();
})

/* GET home page. */
router.get('/', function (req, res, next) {
	res.redirect("/dashboard");
});

/* Test page */
router.get("/test", (req, res) => {
	res.render("test")
})

import accountRouter from "./account.js";
import dashboardRouter from "./dashboard.js";
import listRouter from "./list.js";
import itemRouter from "./item.js";
import searchRouter from "./search.js";
import readerRouter from "./reader.js";
import statsRouter from "./stats.js";
import apiRouter from "./api.js";
import configRouter from "./config.js";
import mailsRouter from "./mails.js";
import reportRouter from "./report.js";
import voucherRouter from "./voucher.js";
import labelRouter from "./label.js";
import segmentationRouter from "./segmentation.js";
import goalsRouter from "./goals.js";
import settingsRouter from "./settings.js";
import articleRouter from "./article.js";
import downloadRouter from "./download.js";

router.use("/account", accountRouter);
router.use("/dashboard", dashboardRouter);
router.use("/list", listRouter);
router.use("/item", itemRouter);
router.use("/search", searchRouter);
router.use("/reader", readerRouter);
router.use("/stats", statsRouter);
router.use("/api", apiRouter);
router.use("/config", configRouter);
router.use("/mails", mailsRouter);
router.use("/report", reportRouter);
router.use("/voucher", voucherRouter);
router.use("/label", labelRouter);
router.use("/segmentation", segmentationRouter);
router.use("/goals", goalsRouter);
router.use("/settings", settingsRouter);
router.use("/article", articleRouter);
router.use("/download", downloadRouter);

export default router;
