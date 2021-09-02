var express = require('express');
var router = express.Router();
const config = require("config");
const JXPHelper = require("jxp-helper");
require("dotenv").config();

router.use("/login", require("./login"));

/* Login */
router.use(async (req, res, next) => {
	res.locals.sitename = config.name 
	if (!req.body.login) return next();
	try {
		const apihelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });
		console.log({ server: config.api.server, apikey: process.env.APIKEY });
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
	} catch(err) {
		console.error(err);
		res.render('login', { title: 'Login', "msg": err.msg || "An unknown error occured" });
		return;
	}
	// next();
});

/* Log in from Wordpress */
router.use(async(req, res, next) => {
	if (req.query.apikey) {
		req.session.apikey = req.query.apikey;
		try {
			if (!req.query.user_id) {
				throw("Missing user_id");
			}
			const user_id = req.query.user_id;
			const user_apihelper = new JXPHelper({ server: config.api.server, apikey: req.session.apikey });
			req.session.user = await user_apihelper.getOne("user", user_id);
			next();
		} catch(err) {
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
router.use((req, res, next) => {
	const Reader = require("../src/javascripts/typedefs/reader");
	const reader = new Reader();
	res.locals.typedefs = { reader };
	res.locals.sitename = config.frontend.sitename;
	res.locals.user = req.session.user;
	res.locals.apikey = req.session.apikey;
	res.locals.apiserver = config.api.server;
	res.locals.pipelineserver = config.pipeline.server;
	// res.locals.daemonserver = config.daemon_api.url;
	req.apihelper = new JXPHelper({ server: config.api.server, apikey: req.session.apikey });
	next();
})

/* Useful shit */
router.use((req, res, next) => {
	res.locals.moment = require("moment-timezone");
	res.locals.formatNumber = require("../libs/formatNumber");
	next();
})

/* GET home page. */
router.get('/', function(req, res, next) {
	res.redirect("/dashboard");
});

/* Test page */
router.get("/test", (req, res) => {
	res.render("test")
})

router.use("/account", require("./account"));
router.use("/dashboard", require("./dashboard"));
router.use("/list", require("./list"));
router.use("/item", require("./item"));
router.use("/search", require("./search"));
router.use("/reader", require("./reader"));
router.use("/stats", require("./stats"));
router.use("/api", require("./api"));
router.use("/config", require("./config"));
router.use("/mails", require("./mails"));
router.use("/report", require("./report"));
router.use("/voucher", require("./voucher"));
router.use("/label", require("./label"));
router.use("/segmentation", require("./segmentation"));
router.use("/goals", require("./goals"));
router.use("/settings", require("./settings"));
router.use("/article", require("./article"));

module.exports = router;
