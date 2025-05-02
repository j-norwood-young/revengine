import fastify from 'fastify';
import cors from '@fastify/cors';
import caching from '@fastify/caching';
import formbody from '@fastify/formbody';
import Redis from 'ioredis';
import config from 'config';
import Reports from '@revengine/reports';
import JXPHelper from 'jxp-helper';
import dotenv from 'dotenv';
import bunyan from 'bunyan';
import crypto from 'crypto';

dotenv.config();

// Create Fastify instance with logging disabled
const app = fastify({
    // logger: false,
    // disableRequestLogging: true
});

// Enhanced logging setup
const log = bunyan.createLogger({
    name: 'wordpress-api',
    streams: [{
        level: process.env.LOG_LEVEL || 'warn',
        stream: process.stdout
    }],
    serializers: {
        err: bunyan.stdSerializers.err,
        req: bunyan.stdSerializers.req,
        res: bunyan.stdSerializers.res
    }
});

// Process monitoring
process.on('SIGTERM', () => {
    log.error('Received SIGTERM signal - process is being terminated');
    logMemoryUsage();
    process.exit(1);
});

process.on('SIGINT', () => {
    log.error('Received SIGINT signal - process is being interrupted');
    logMemoryUsage();
    process.exit(1);
});

process.on('exit', (code) => {
    log.error(`Process exit with code: ${code}`);
    logMemoryUsage();
});

// Enhanced error tracking
let lastError = null;
let errorCount = 0;
const trackError = (err, context = '') => {
    errorCount++;
    lastError = {
        timestamp: new Date(),
        error: err,
        context,
        memory: process.memoryUsage(),
        stack: err.stack
    };
    log.error({
        count: errorCount,
        context,
        error: err.message,
        stack: err.stack,
        memory: {
            rss: `${Math.round(lastError.memory.rss / 1024 / 1024 * 100) / 100} MB`,
            heapTotal: `${Math.round(lastError.memory.heapTotal / 1024 / 1024 * 100) / 100} MB`,
            heapUsed: `${Math.round(lastError.memory.heapUsed / 1024 / 1024 * 100) / 100} MB`
        }
    });
};

// Memory usage logging
const logMemoryUsage = () => {
    const used = process.memoryUsage();
    const metrics = {
        rss: `${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB`,
        heapTotal: `${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB`,
        heapUsed: `${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`,
        heapUsedPercentage: `${Math.round(used.heapUsed / used.heapTotal * 100)}%`,
        external: `${Math.round(used.external / 1024 / 1024 * 100) / 100} MB`,
    };
    log.info('Memory usage:', metrics);
};

// Enhanced uncaught exception handler
process.on('uncaughtException', (err) => {
    trackError(err, 'Uncaught Exception');
    log.error('Uncaught Exception:', err);
    log.error('Stack trace:', err.stack);
    logMemoryUsage();
});

// Enhanced unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
    trackError(reason, 'Unhandled Rejection');
    log.error('Unhandled Rejection at:', promise);
    log.error('Reason:', reason);
    logMemoryUsage();
});

// Log memory usage every minute
setInterval(logMemoryUsage, 60000);
// Initial memory usage log
logMemoryUsage();

// Initialize JXPHelper
const jxphelper = new JXPHelper({
    server: process.env.API_SERVER || config.api.server,
    apikey: process.env.APIKEY
});

// Redis configuration
const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB || 0,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
});

// Redis error handling
redis.on('error', (err) => {
    log.error('Redis error:', err);
});

redis.on('connect', () => {
    log.info('Redis connected successfully');
});

// Helper function to generate valid ETag
const generateETag = (content) => {
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    const hash = crypto.createHash('md5').update(contentStr).digest('hex');
    return `"${hash}"`;
};

// Register CORS plugin
await app.register(cors, {
    origin: config.cors_origins || ["*"],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
});

// Register formbody plugin to handle form data
await app.register(formbody);

// Register caching plugin with proper configuration
await app.register(caching, {
    privacy: caching.privacy.PUBLIC,
    expiresIn: 300, // 5 minutes
    cacheSegment: 'wordpress-api',
    serverExpiresIn: 300 // Also cache in shared caches (like CDNs)
});

// Add cache logging middleware - only log cache misses and errors
app.addHook('onRequest', async (request, reply) => {
    const start = Date.now();
    reply.raw.on('finish', () => {
        const duration = Date.now() - start;
        const cacheStatus = reply.getHeader('x-cache') || 'MISS';

        if (cacheStatus === 'MISS' || reply.statusCode >= 400) {
            log.info({
                method: request.method,
                url: request.url,
                status: reply.statusCode,
                duration: `${duration}ms`,
                cacheStatus,
                cacheControl: reply.getHeader('cache-control'),
                etag: reply.getHeader('etag')
            });
        }
    });
});

// Test endpoint to verify caching
app.get('/test-cache', async (request, reply) => {
    const timestamp = new Date().toISOString();
    const response = {
        message: 'This response should be cached for 5 minutes',
        timestamp,
        cacheInfo: {
            cacheControl: reply.getHeader('cache-control'),
            etag: reply.getHeader('etag')
        }
    };

    reply.header('x-cache', 'HIT');
    reply.etag(generateETag(response));
    return response;
});

// Add request logging middleware
app.addHook('onRequest', async (request, reply) => {
    const start = Date.now();
    reply.raw.on('finish', () => {
        const duration = Date.now() - start;
        log.info({
            method: request.method,
            url: request.url,
            status: reply.statusCode,
            duration: `${duration}ms`,
            userAgent: request.headers['user-agent'],
            ip: request.headers['x-forwarded-for'] || request.ip
        });
    });
});

// Error handler
app.setErrorHandler((error, request, reply) => {
    trackError(error, 'Fastify Error');
    log.error('Error:', error);
    log.error('Request:', {
        url: request.url,
        method: request.method,
        headers: request.headers,
        params: request.params,
        query: request.query,
        body: request.body
    });
    logMemoryUsage();
    reply.status(500).send({ status: "error", message: "Internal server error" });
});

// Random articles endpoint
app.post('/random', async (request, reply) => {
    try {
        const { size = 1, ignore_post_ids = [], published_start_date = null, published_end_date = null, jitter_factor = 10 } = request.body;
        const report = new Reports.Random({ size, published_start_date, published_end_date, ignore_post_ids, jitter_factor });
        const result = await report.random_articles();
        return { size, ignore_post_ids, published_start_date, published_end_date, jitter_factor, result };
    } catch (err) {
        log.error(err);
        throw err;
    }
});

// Top articles report function
const top_articles_report = async (params) => {
    try {
        const report = new Reports.TopLastPeriod();
        const default_params = {
            size: 5,
            start_period: "now-1h/h",
            end_period: "now/h",
        }
        params = Object.assign(default_params, params);
        const top_articles = await report.run(params);
        const pipeline = [
            {
                $match: {
                    post_id: { $in: top_articles.map(a => a.key) }
                }
            },
            {
                $project: {
                    post_id: 1,
                    title: 1,
                    urlid: 1,
                    author: 1,
                    exceprt: 1,
                    sections: 1,
                    tags: 1,
                    custom_section_label: 1,
                    date_published: 1,
                    date_modified: 1,
                    img_thumbnail: 1,
                    img_medium: 1,
                    img_full: 1
                }
            }
        ];
        let articles = (await jxphelper.aggregate("article", pipeline)).data;
        for (let article of articles) {
            article.hits = top_articles.find(hit => hit.key === article.post_id).doc_count;
            article.url = `https://www.dailymaverick.co.za/article/${article.date_published.substring(0, 10)}-${article.urlid}`;
        }
        articles.sort((a, b) => b.hits - a.hits);
        return articles.slice(0, params.size);
    } catch (err) {
        throw err;
    }
}

// Top articles by period endpoint with caching
app.get('/top_articles/:period', async (request, reply) => {
    try {
        const periods = {
            hour: "now-1h/h",
            day: "now-1d/d",
            week: "now-7d/d",
            month: "now-30d/d",
        }
        const period = request.params.period;
        if (!periods[period]) throw `Unknown period. Choose from ${Object.keys(periods).join(", ")}`;
        const size = request.query.size || 5;
        const start_period = periods[period];
        const end_period = "now/h";
        const params = Object.assign({ size, start_period, end_period }, request.query);

        const articles = await top_articles_report(params);

        // Set cache headers with properly formatted ETag
        reply.etag(generateETag(articles));
        return articles;
    } catch (err) {
        log.error(err);
        throw err;
    }
});

// Default top articles endpoint with caching
app.get('/top_articles', async (request, reply) => {
    try {
        const params = Object.assign({
            size: request.query.size || 5,
            start_period: "now-1h/h",
        }, request.query);
        const articles = await top_articles_report(params);

        // Set cache headers with properly formatted ETag
        reply.etag(generateETag(articles));
        return articles;
    } catch (err) {
        log.error(err);
        throw err;
    }
});

// Front page endpoint
app.get('/front_page', async (request, reply) => {
    try {
        if (!process.env.REVENGINE_WORDPRESS_KEY) {
            throw new Error("REVENGINE_WORDPRESS_KEY is not set");
        }
        const result = await fetch(`${config.wordpress.server}/wp-json/revengine/v1/featured`, {
            method: 'get',
            headers: {
                'Authorization': `Bearer ${process.env.REVENGINE_WORDPRESS_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        const json_result = await result.json();
        if (json_result.code === "rest_forbidden") {
            throw new Error("Wordpress REST API error - rest_forbidden");
        }
        const articles = json_result.data;
        const report = new Reports.TopLastHour();
        for (let article of articles) {
            const hits = await report.run({ article_id: article.post_id });
            article.hits = hits[0] ? hits[0].doc_count : 0;
        }
        return articles;
    } catch (err) {
        log.error('Error in /front_page:', err);
        log.error('Stack trace:', err.stack);
        throw err;
    }
});

// Top articles by section endpoint
app.get('/top_articles_by_section/:section', async (request, reply) => {
    try {
        const report = new Reports.TopLastHour();
        const size = request.query.size || 5;
        const top_articles = await report.run({ size, section: request.params.section });
        const articles = (await jxphelper.aggregate("article", [
            {
                $match: {
                    post_id: { $in: top_articles.map(a => a.key) }
                }
            },
            {
                $project: {
                    post_id: 1,
                    title: 1,
                    urlid: 1,
                    author: 1,
                    exceprt: 1,
                    sections: 1,
                    tags: 1,
                    date_published: 1,
                    date_modified: 1
                }
            }
        ])).data;

        for (let article of articles) {
            const hit = top_articles.find(hit => hit.key === article.post_id);
            article.hits_last_hour = hit ? hit.doc_count : 0;
        }
        articles.sort((a, b) => b.hits_last_hour - a.hits_last_hour);
        return articles;
    } catch (err) {
        log.error('Error in /top_articles_by_section:', err);
        log.error('Request params:', request.params);
        log.error('Stack trace:', err.stack);
        throw err;
    }
});

// Reader endpoint
app.get('/reader/:wordpress_id', async (request, reply) => {
    try {
        const wordpress_id = request.params.wordpress_id;
        const reader = (await jxphelper.get("reader", {
            "filter[wordpress_id]": wordpress_id,
            "populate[segment]": "code",
            "fields": "segmentation_id"
        })).data.pop();

        if (!reader) {
            log.info(`Reader not found for wordpress_id: ${wordpress_id}`);
            return reply.status(404).send({ status: "error", message: "Reader not found" });
        }

        return {
            status: "ok",
            data: {
                segments: reader.segment ? reader.segment.map(segment => segment.code) : [],
                labels: reader.lbl || [],
                authors: reader.authors || [],
                sections: reader.sections || []
            }
        };
    } catch (err) {
        log.error('Error in /reader endpoint:', err);
        log.error('Request params:', request.params);
        log.error('Stack trace:', err.stack);
        throw err;
    }
});

// Analytics posts GET endpoint
app.get('/analytics/posts', async (request, reply) => {
    try {
        let post_ids = request.query['post_ids[]'] || request.query.post_ids;

        // Handle array-like format (post_ids[0], post_ids[1], etc)
        if (!post_ids) {
            post_ids = Object.keys(request.query)
                .filter(key => key.startsWith('post_ids['))
                .map(key => request.query[key]);
        }

        if (!post_ids || post_ids.length === 0) {
            return [];
        }

        // Convert to array if it's a string
        if (typeof post_ids === 'string') {
            post_ids = post_ids.split(',').map(id => id.trim());
        }

        // Convert all IDs to numbers
        post_ids = post_ids.map(id => Number(id));

        // Limit to 100 items
        if (post_ids.length > 100) {
            log.warn(`Too many post_ids (${post_ids.length}), limiting to 100`);
            post_ids = post_ids.slice(0, 100);
        }

        log.info('Processing analytics for post_ids:', post_ids);

        const report = new Reports.TopLastHour();
        const post_hits = await report.run({ article_id: post_ids });

        return post_hits.map(a => ({
            post_id: a.key,
            hits: a.doc_count,
            avg_scroll_depth: Math.round(a.avg_scroll_depth.value),
            avg_seconds_on_page: Math.round(a.avg_seconds_on_page.value)
        }));
    } catch (err) {
        log.error('Error in GET /analytics/posts:', err);
        log.error('Request query:', request.query);
        log.error('Stack trace:', err.stack);
        throw err;
    }
});

// Analytics posts POST endpoint
app.post('/analytics/posts', async (request, reply) => {
    try {
        let post_ids = request.body['post_ids[]'] || request.body.post_ids;

        // Handle array-like format (post_ids[0], post_ids[1], etc)
        if (!post_ids) {
            post_ids = Object.keys(request.body)
                .filter(key => key.startsWith('post_ids['))
                .map(key => request.body[key]);
        }

        if (!post_ids) {
            throw new Error('No post_ids provided');
        }

        // Convert to array if it's a string
        if (typeof post_ids === 'string') {
            post_ids = post_ids.split(',').map(id => id.trim());
        }

        // Convert all IDs to numbers and sort them for consistent cache key
        post_ids = post_ids.map(id => Number(id)).sort((a, b) => a - b);

        // Limit to 100 items
        if (post_ids.length > 100) {
            log.warn(`Too many post_ids (${post_ids.length}), limiting to 100`);
            post_ids = post_ids.slice(0, 100);
        }

        log.info('Processing analytics for post_ids:', post_ids);

        // Create MD5 hash of the post_ids for the cache key
        const postIdsString = post_ids.join(',');
        const cacheKey = `analytics:posts:${crypto.createHash('md5').update(postIdsString).digest('hex')}`;
        log.info('Generated cache key:', cacheKey);

        // Try to get cached result
        log.info('Checking Redis cache for key:', cacheKey);
        const cachedResult = await redis.get(cacheKey);
        if (cachedResult) {
            log.info('Cache hit for analytics posts');
            log.info('Cached result size:', cachedResult.length);
            return JSON.parse(cachedResult);
        }

        log.info('Cache miss for analytics posts');
        const report = new Reports.TopLastHour();
        const top_articles = await report.run({ article_id: post_ids });

        const result = [];
        for (let post_id of post_ids) {
            const post = top_articles.find(a => a.key === Number(post_id));
            result.push({
                post_id,
                hits: post ? post.doc_count : 0,
                avg_scroll_depth: post ? Math.round(post.avg_scroll_depth.value) : 0,
                avg_seconds_on_page: post ? Math.round(post.avg_seconds_on_page.value) : 0
            });
        }

        // Cache the result for 5 minutes (300 seconds)
        const resultString = JSON.stringify(result);
        log.info('Caching result with key:', cacheKey);
        log.info('Result size to cache:', resultString.length);
        await redis.setex(cacheKey, 300, resultString);
        log.info('Successfully cached result');

        return result;
    } catch (err) {
        log.error('Error in POST /analytics/posts:', err);
        log.error('Request body:', request.body);
        log.error('Stack trace:', err.stack);
        throw err;
    }
});

// Simulate top articles endpoint
app.post('/simulate/top_articles', async (request, reply) => {
    try {
        const { posts } = request.body;
        log.info('Simulating top articles for posts:', JSON.stringify(posts));

        if (!Array.isArray(posts)) {
            throw new Error('Posts must be an array');
        }

        const simulatedPosts = posts.map(post => ({
            ...post,
            hits_last_hour: Math.floor(Math.random() * 100)
        }));

        log.info('Simulated posts:', JSON.stringify(simulatedPosts));
        return simulatedPosts;
    } catch (err) {
        log.error('Error in /simulate/top_articles:', err);
        log.error('Request body:', JSON.stringify(request.body));
        log.error('Stack trace:', err.stack);
        throw err;
    }
});

// Start the server
const start = async () => {
    try {
        await app.listen({
            port: process.env.PORT || config.wordpress.port,
            host: '0.0.0.0'
        });
        log.info(`Server listening at ${app.server.address().port}`);
    } catch (err) {
        log.error(err);
        process.exit(1);
    }
};

start();