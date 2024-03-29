const config = require("config");
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const redis = require("redis");
const dotenv = require("dotenv");
dotenv.config();

const redis_url = process.env.REDIS_URL || config.redis.url;

const client = redis.createClient({
	url: redis_url
});

const indexRouter = require('./routes/index');

const app = express();

/* Sessions */
const session = require('express-session');
const RedisStore = require('connect-redis')(session);

app.use(session({
	secret: config.frontend.secret,
	store: new RedisStore({ host: 'localhost', port: 6379, client }),
	resave: false,
	saveUninitialized: true,
}));

// parse application/x-www-form-urlencoded
app.use(express.urlencoded({limit: '50mb', extended: true }))

// parse application/json
app.use(express.json({limit: '50mb'}))

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev', {
	skip: function (req, res) { return res.statusCode < 400 }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};

	// render the error page
	res.status(err.status || 500);
	res.render('error');
});

module.exports = app;
