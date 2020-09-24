const mongoose = require("mongoose");
const JXP = require("jxp");
const config = require("config");

const trimuser = function (user) {
	if (!user) {
		return null;
	}
	return {
		_id: user._id,
		email: user.email,
		name: user.name,
		organisation_id: user.organisation_id,
		location_id: user.location_id
	};
};
const apiconfig = Object.assign({}, config.api);

apiconfig.callbacks = {
	post: async function (modelname, item, user) {
	},
	put: async function (modelname, item, user) {
	},
	delete: async function (modelname, item, user, opts) {
	}
};

apiconfig.pre_hooks = {
	get: (req, res, next) => {
		next();
	},
	getOne: (req, res, next) => {
		next();
	},
	post: (req, res, next) => {
		next();
	},
	put: (req, res, next) => {
		next();
	},
	delete: (req, res, next) => {
		next();
	},
};

//DB connection
// ES6 promises
mongoose.Promise = Promise;
if (!apiconfig.mongo.options) apiconfig.mongo.options = {};
const mongo_options = Object.assign({}, apiconfig.mongo.options, {
	promiseLibrary: global.Promise,
	useNewUrlParser: true,
	useCreateIndex: true,
	useUnifiedTopology: true,
});

// mongodb connection
mongoose.connect(apiconfig.mongo.connection_string, mongo_options);

const db = mongoose.connection;

// mongodb error
db.on('error', console.error.bind(console, 'connection error:'));

// mongodb connection open
db.once('open', () => {
	console.log(`Connected to Mongo at: ${new Date()}`);
});

var server = new JXP(apiconfig);

server.listen(apiconfig.port || 4001, function () {
	console.log('%s listening at %s', server.name, server.url);
});

module.exports = server; // For testing