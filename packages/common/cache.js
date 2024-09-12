const config = require("config");
const Redis = require("ioredis")
const dotenv = require("dotenv");
dotenv.config();

let redis;

if (process.env.REDIS_CLUSTER) {
    const nodes = process.env.REDIS_CLUSTER_NODES.split(",");
    redis = new Redis.Cluster(nodes.map(node => {
        const [host, port] = node.split(":");
        return { host, port };
    }));
} else if (config.redis.cluster) {
    redis = new Redis.Cluster(config.redis.cluster);
} else {
    const redis_url = process.env.REDIS_URL || config.redis.url;
    redis = new Redis(redis_url);
}

redis.on("error", (err) => {
    console.error("Redis error", err);
});

const errs = require('restify-errors');
const crypto = require("crypto");

/**
 * Calculates the MD5 hash of a given string.
 *
 * @param {string} str - The string to calculate the MD5 hash for.
 * @returns {string} The MD5 hash of the input string.
 */
function md5(str) {
    // Generate md5 hash of string
    const md5sum = crypto.createHash("md5");
    md5sum.update(str);
    return md5sum.digest("hex");
}

/**
 * Cache class for managing data caching using Redis.
 */
class Cache {
    /**
     * Create a new instance of the Cache class.
     * @param {Object} opts - Options for configuring the cache.
     * @param {boolean} opts.debug - Whether to enable debug mode. Default is false.
     * @param {string} opts.prefix - The prefix to use for cache keys. Default is "revengine".
     * @param {number} opts.ttl - The default time-to-live for cache keys in seconds. Default is 60.
     */
    constructor(opts = {}) {
        this.debug = opts.debug || false;
        this.prefix = opts.prefix || "revengine";
        this.ttl = opts.ttl || 60;
        this.redis = redis;
        this.debug = opts.debug || false;
    }

    /**
     * Get the value associated with the specified key from the cache.
     * @param {string} key - The key to retrieve the value for.
     * @returns {Promise<any>} - A promise that resolves to the value associated with the key, or null if not found.
     */
    async get(key) {
        try {
            this.debug && console.log(`Getting ${key}`);
            const result = await this.redis.get(`${this.prefix}:${key}`);
            this.debug && console.log(`Got result for ${key}`)
            if (result) return JSON.parse(result);
            return null;
        } catch (err) {
            console.error(err);
            return null;
        }
    }

    /**
     * Set the value associated with the specified key in the cache.
     * @param {string} key - The key to set the value for.
     * @param {any} value - The value to set.
     * @param {number} ttl - The time-to-live for the key-value pair in seconds. Default is global ttl or 60.
     * @returns {Promise<void>} - A promise that resolves when the value is set in the cache.
     */
    async set(key, value, ttl) {
        ttl = ttl || this.ttl;
        const json_value = JSON.stringify(value);
        this.debug && console.log(`Setting ${key} to ${json_value.length}`)
        return await this.redis.set(`${this.prefix}:${key}`, json_value, "EX", ttl);
    }

    /**
     * Delete the value associated with the specified key from the cache.
     * @param {string} key - The key to delete the value for.
     * @returns {Promise<void>} - A promise that resolves when the value is deleted from the cache.
     */
    async del(key) {
        return await this.redis.del(`${this.prefix}:${key}`);
    }

    /**
     * Get all the keys in the cache that match the specified pattern.
     * @param {string} search - The pattern to match keys against. Default is "*".
     * @returns {Promise<string[]>} - A promise that resolves to an array of keys.
     */
    async keys(search = "*") {
        return await this.redis.keys(`${this.prefix}:${search}`);
    }

    /**
     * Check if a value associated with the specified key exists in the cache.
     * @param {string} key - The key to check for existence.
     * @returns {Promise<boolean>} - A promise that resolves to true if the key exists, false otherwise.
     */
    exists(key) {
        return this.redis.exists(`${this.prefix}:${key}`);
    }

    /**
     * Set the time-to-live for the specified key in the cache.
     * @param {string} key - The key to set the time-to-live for.
     * @param {number} ttl - The time-to-live in seconds.
     * @returns {Promise<void>} - A promise that resolves when the time-to-live is set for the key.
     */
    async expire(key, ttl) {
        return await this.redis.expire(`${this.prefix}:${key}`, ttl);
    }

    /**
     * Middleware function for caching GET requests for Restify.
     * @param {Object} req - The request object.
     * @param {Object} res - The response object.
     * @returns {boolean} - Returns true if the response was served from cache, false otherwise.
     */
    async restify_cache_middleware(req, res, next) {
        try {
            // If GET request, check cache
            if (req.method != "GET") return false;
            const url = req.url;
            // console.log({ url });
            const key = md5(url);
            // console.log({ key });
            const cached = await this.get(key);
            if (cached) {
                this.debug && console.log("Cache hit");
                // Write header x-cache: hit
                res.header("x-cache", "hit");
                res.send(cached);
                return true;
            }
            // Deal with res.send
            res.sendResponse = res.send;
            res.send = async (body) => {
                this.debug && console.log("Setting cache", key);
                await this.set(key, body);
                res.sendResponse(body);
                this.debug && console.log("Done here");
            }
            // Deal with res.write, res.end
            const buffer = [];
            res.writeResponse = res.write;
            res.write = async (body) => {
                this.debug && console.log("Setting cache", key);
                buffer.push(body);
                res.writeResponse(body);
                this.debug && console.log("Done here");
            }
            res.endResponse = res.end;
            res.end = async (body) => {
                if (body) buffer.push(body);
                this.debug && console.log("Setting cache", key);
                await this.set(key, buffer.join(""));
                res.endResponse(body);
                this.debug && console.log("Done here");
            }
            res.header("x-cache", "miss");
            this.debug && console.log("Cache miss");
            return next();
        } catch (err) {
            console.error(err);
            res.send(new errs.InternalServerError(err));
        }
    }
}

module.exports = Cache;