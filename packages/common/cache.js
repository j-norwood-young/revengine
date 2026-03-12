import config from "config";
import Redis from "ioredis";
import dotenv from "dotenv";
import errs from 'restify-errors';
import crypto from "crypto";
dotenv.config();

let redis = null;
let connectionFailed = false;

function getRedisConnection() {
    if (redis && !connectionFailed) {
        return redis;
    }
    
    // Reset failed flag if we're recreating
    connectionFailed = false;
    
    try {
        if (process.env.REDIS_CLUSTER) {
            const nodes = process.env.REDIS_CLUSTER_NODES.split(",");
            redis = new Redis.Cluster(nodes.map(node => {
                const [host, port] = node.split(":");
                return { host, port };
            }), {
                maxRedirections: 3,
                retryStrategy: (times) => {
                    // Stop retrying after 10 attempts to prevent infinite loops
                    if (times > 10) {
                        console.error("Redis cluster connection failed after 10 retries");
                        connectionFailed = true;
                        return null; // Stop retrying
                    }
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                },
                enableOfflineQueue: true,
                enableReadyCheck: true,
                clusterRetryStrategy: (times) => {
                    if (times > 10) {
                        console.error("Redis cluster retry failed after 10 attempts");
                        connectionFailed = true;
                        return null;
                    }
                    return Math.min(times * 50, 2000);
                }
            });
        } else if (config.redis?.cluster) {
            redis = new Redis.Cluster(config.redis.cluster, {
                maxRedirections: 3,
                retryStrategy: (times) => {
                    if (times > 10) {
                        console.error("Redis cluster connection failed after 10 retries");
                        connectionFailed = true;
                        return null;
                    }
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                },
                enableOfflineQueue: true,
                enableReadyCheck: true,
                clusterRetryStrategy: (times) => {
                    if (times > 10) {
                        console.error("Redis cluster retry failed after 10 attempts");
                        connectionFailed = true;
                        return null;
                    }
                    return Math.min(times * 50, 2000);
                }
            });
        } else {
            const redis_url = process.env.REDIS_URL || config.redis?.url || 'redis://localhost:6379';
            redis = new Redis(redis_url, {
                retryStrategy: (times) => {
                    if (times > 10) {
                        console.error("Redis connection failed after 10 retries");
                        connectionFailed = true;
                        return null;
                    }
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                },
                enableOfflineQueue: true,
                enableReadyCheck: true
            });
        }

        redis.on("error", (err) => {
            // Don't log "Connection is closed" errors repeatedly
            if (!err.message.includes("Connection is closed")) {
                console.error("Redis error", err);
            }
        });
        
        redis.on("close", () => {
            console.warn("Redis connection closed");
            // Don't reset connectionFailed here - let retryStrategy handle it
        });
        
        redis.on("ready", () => {
            connectionFailed = false;
        });
        
        return redis;
    } catch (err) {
        console.error("Failed to create Redis connection:", err);
        connectionFailed = true;
        throw err;
    }
}

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
        this.redis = getRedisConnection();
        this.debug = opts.debug || false;
    }

    /**
     * Get the value associated with the specified key from the cache.
     * @param {string} key - The key to retrieve the value for.
     * @returns {Promise<any>} - A promise that resolves to the value associated with the key, or null if not found.
     */
    async get(key) {
        try {
            if (connectionFailed) {
                return null;
            }
            this.debug && console.log(`Getting ${key}`);
            const result = await this.redis.get(`${this.prefix}:${key}`);
            this.debug && console.log(`Got result for ${key}`)
            if (result) return JSON.parse(result);
            return null;
        } catch (err) {
            if (!err.message.includes("Too many Cluster redirections") && 
                !err.message.includes("Connection is closed") &&
                !err.message.includes("Cluster isn't ready")) {
                console.error(`Error getting cache key ${key}:`, err);
            }
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
        try {
            if (connectionFailed) {
                return null;
            }
            ttl = ttl || this.ttl;
            const json_value = JSON.stringify(value);
            this.debug && console.log(`Setting ${key} to ${json_value.length}`)
            return await this.redis.set(`${this.prefix}:${key}`, json_value, "EX", ttl);
        } catch (err) {
            if (!err.message.includes("Too many Cluster redirections") && 
                !err.message.includes("Connection is closed") &&
                !err.message.includes("Cluster isn't ready")) {
                console.error(`Error setting cache key ${key}:`, err);
            }
            // Don't throw - allow application to continue if cache operation fails
            return null;
        }
    }

    /**
     * Delete the value associated with the specified key from the cache.
     * @param {string} key - The key to delete the value for.
     * @returns {Promise<void>} - A promise that resolves when the value is deleted from the cache.
     */
    async del(key) {
        try {
            // Check if connection is in a failed state
            if (connectionFailed) {
                return null;
            }
            return await this.redis.del(`${this.prefix}:${key}`);
        } catch (err) {
            // Suppress "Too many Cluster redirections" and "Connection is closed" errors
            if (!err.message.includes("Too many Cluster redirections") && 
                !err.message.includes("Connection is closed") &&
                !err.message.includes("Cluster isn't ready")) {
                console.error(`Error deleting cache key ${key}:`, err);
            }
            // Don't throw - allow application to continue if cache operation fails
            return null;
        }
    }

    /**
     * Get all the keys in the cache that match the specified pattern.
     * @param {string} search - The pattern to match keys against. Default is "*".
     * @returns {Promise<string[]>} - A promise that resolves to an array of keys.
     */
    async keys(search = "*") {
        try {
            if (connectionFailed) {
                return [];
            }
            return await this.redis.keys(`${this.prefix}:${search}`);
        } catch (err) {
            if (!err.message.includes("Too many Cluster redirections") && 
                !err.message.includes("Connection is closed") &&
                !err.message.includes("Cluster isn't ready")) {
                console.error(`Error getting cache keys with pattern ${search}:`, err);
            }
            return [];
        }
    }

    /**
     * Check if a value associated with the specified key exists in the cache.
     * @param {string} key - The key to check for existence.
     * @returns {Promise<boolean>} - A promise that resolves to true if the key exists, false otherwise.
     */
    async exists(key) {
        try {
            if (connectionFailed) {
                return false;
            }
            return await this.redis.exists(`${this.prefix}:${key}`);
        } catch (err) {
            if (!err.message.includes("Too many Cluster redirections") && 
                !err.message.includes("Connection is closed") &&
                !err.message.includes("Cluster isn't ready")) {
                console.error(`Error checking cache key existence ${key}:`, err);
            }
            return false;
        }
    }

    /**
     * Set the time-to-live for the specified key in the cache.
     * @param {string} key - The key to set the time-to-live for.
     * @param {number} ttl - The time-to-live in seconds.
     * @returns {Promise<void>} - A promise that resolves when the time-to-live is set for the key.
     */
    async expire(key, ttl) {
        try {
            if (connectionFailed) {
                return null;
            }
            return await this.redis.expire(`${this.prefix}:${key}`, ttl);
        } catch (err) {
            if (!err.message.includes("Too many Cluster redirections") && 
                !err.message.includes("Connection is closed") &&
                !err.message.includes("Cluster isn't ready")) {
                console.error(`Error setting expiry for cache key ${key}:`, err);
            }
            return null;
        }
    }

    /**
     * Close the Redis connection.
     * @returns {Promise<void>} - A promise that resolves when the connection is closed.
     */
    async close() {
        try {
            if (this.redis) {
                await this.redis.quit();
                redis = null;
                if (this.debug) {
                    console.log("Redis connection closed");
                }
            }
        } catch (err) {
            console.error("Error closing Redis connection:", err);
            throw err;
        }
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

export default Cache;