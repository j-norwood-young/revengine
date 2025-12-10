/**
 * @fileoverview Low-level access to Mongo
 * @module mongo
 */

import { MongoClient, ObjectId } from 'mongodb';
import config from 'config';

const connection_string = config.api.mongo.connection_string;
const client = new MongoClient(connection_string);
let is_connected = false;

/**
 * Connects to the MongoDB server.
 * @async
 */
export const connect = async () => {
    if (!is_connected) await client.connect();
    is_connected = true;
};

/**
 * Inserts a single document into a collection.
 * @async
 * @param {string} collection - The name of the collection.
 * @param {object} data - The document to be inserted.
 * @returns {object} - The result of the insertion operation.
 */
export const insertOne = async (collection, data) => {
    try {
        if (!is_connected) await connect();
        const db = client.db(config.api.mongo.db);
        const result = await db.collection(collection).insertOne(data);
        return result;
    } catch (err) {
        console.error(err);
    }
};

/**
 * Inserts multiple documents into a collection.
 * @async
 * @param {string} collection - The name of the collection.
 * @param {object[]} data - The documents to be inserted.
 * @returns {object} - The result of the insertion operation.
 */
export const insertMany = async (collection, data) => {
    try {
        if (!is_connected) await connect();
        const db = client.db(config.api.mongo.db);
        const result = await db.collection(collection).insertMany(data);
        return result;
    } catch (err) {
        console.error(err);
    }
};

/**
 * Finds a single document in a collection that matches the query.
 * @async
 * @param {string} collection - The name of the collection.
 * @param {object} query - The query to filter the documents.
 * @returns {object} - The matched document.
 */
export const findOne = async (collection, query) => {
    try {
        if (!is_connected) await connect();
        const db = client.db(config.api.mongo.db);
        const result = await db.collection(collection).findOne(query);
        return result;
    } catch (err) {
        console.error(err);
    }
};

/**
 * Finds documents in a collection that match the query.
 * @async
 * @param {string} collection - The name of the collection.
 * @param {object} query - The query to filter the documents.
 * @returns {object[]} - The matched documents.
 */
export const find = async (collection, query) => {
    try {
        if (!is_connected) await connect();
        const db = client.db(config.api.mongo.db);
        const result = await db.collection(collection).find(query).toArray();
        return result;
    } catch (err) {
        console.error(err);
    }
};

/**
 * Updates a single document in a collection that matches the query.
 * @async
 * @param {string} collection - The name of the collection.
 * @param {object} query - The query to filter the documents.
 * @param {object} update - The update query. Note you must use the $set operator to update the document.
 * @returns {object} - The result of the update operation.
 */
export const updateOne = async (collection, query, update) => {
    try {
        if (!is_connected) await connect();
        const db = client.db(config.api.mongo.db);
        const result = await db.collection(collection).updateOne(query, update);
        return result;
    } catch (err) {
        console.error(err);
    }
};

/**
 * Updates multiple documents in a collection that match the query.
 * @async
 * @param {string} collection - The name of the collection.
 * @param {object} query - The query to filter the documents.
 * @param {object} update - The update query. Note you need to use the $set operator to update specific fields.
 * @returns {object} - The result of the update operation.
 */
export const updateMany = async (collection, query, update) => {
    try {
        if (!is_connected) await connect();
        const db = client.db(config.api.mongo.db);
        const result = await db.collection(collection).updateMany(query, update);
        return result;
    } catch (err) {
        console.error(err);
    }
};

/**
 * Deletes a single document from a collection that matches the query.
 * @async
 * @param {string} collection - The name of the collection.
 * @param {object} query - The query to filter the documents.
 * @returns {object} - The result of the delete operation.
 */
export const deleteOne = async (collection, query) => {
    try {
        if (!is_connected) await connect();
        const db = client.db(config.api.mongo.db);
        const result = await db.collection(collection).deleteOne(query);
        return result;
    } catch (err) {
        console.error(err);
    }
};

/**
 * Deletes multiple documents from a collection that match the query.
 * @async
 * @param {string} collection - The name of the collection.
 * @param {object} query - The query to filter the documents.
 * @returns {object} - The result of the delete operation.
 */
export const deleteMany = async (collection, query) => {
    try {
        if (!is_connected) await connect();
        const db = client.db(config.api.mongo.db);
        const result = await db.collection(collection).deleteMany(query);
        return result;
    } catch (err) {
        console.error(err);
    }
};

/**
 * Drops a collection from the database.
 * @async
 * @param {string} collection - The name of the collection to drop.
 * @returns {object} - The result of the drop operation.
 */
export const dropCollection = async (collection) => {
    try {
        if (!is_connected) await connect();
        const db = client.db(config.api.mongo.db);
        const result = await db.collection(collection).drop();
        return result;
    } catch (err) {
        console.error(err);
    }
};

/**
 * Checks if a collection exists in the database.
 * @async
 * @param {string} collection - The name of the collection to check.
 * @returns {boolean} - True if the collection exists, false otherwise.
 */
export const collectionExists = async (collection) => {
    try {
        if (!is_connected) await connect();
        const db = client.db(config.api.mongo.db);
        const collections = await db.collections();
        return collections.map(c => c.s.namespace.collection).includes(collection);
    } catch (err) {
        console.error(err);
    }
};

/**
 * Performs an aggregation operation on a collection.
 * @async
 * @param {string} collection - The name of the collection.
 * @param {object[]} pipeline - The aggregation pipeline.
 * @returns {object[]} - The result of the aggregation operation.
 */
export const aggregate = async (collection, pipeline) => {
    try {
        if (!is_connected) await connect();
        const db = client.db(config.api.mongo.db);
        const result = await db.collection(collection).aggregate(pipeline).toArray();
        return result;
    } catch (err) {
        console.error(err);
    }
};

/**
 * Performs a bulk write operation on a collection.
 * @async
 * @param {string} collection - The name of the collection.
 * @param {object[]} operations - The bulk write operations.
 * @returns {object} - The result of the bulk write operation.
 */
export const bulkWrite = async (collection, operations) => {
    try {
        if (!is_connected) await connect();
        const db = client.db(config.api.mongo.db);
        const result = await db.collection(collection).bulkWrite(operations);
        return result;
    } catch (err) {
        console.error(err);
    }
};

export const ensureIndex = async (collection, index) => {
    try {
        if (!is_connected) await connect();
        const db = client.db(config.api.mongo.db);
        await db.collection(collection).createIndex(index);
    } catch (err) {
        console.error(err);
    }
};

/**
 * 
 * @param {string} id - The id to convert to ObjectId.
 * @returns {ObjectId} - The converted id.
 */
export const toObjectId = (id) => {
    return new ObjectId(id);
}

/**
 * Closes the connection to the MongoDB server.
 * @async
 */
export const close = async () => {
    if (!is_connected) return;
    if (!client) return;
    await client.close();
    is_connected = false;
};
