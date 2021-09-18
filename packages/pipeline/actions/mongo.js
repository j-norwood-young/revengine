/*
 * Perform random updateOne, updateMany, insert, insertOne, insertMany operations on MongoDB
 * 
 * this.data is expected to be an array with elements as follows:
 * [{
 *  "op": "updateOne",
 *  "filter": {
 *      "blah": "yack"
 *  },
 *  "update": {
 *      "$set": { "blah": "shmack" }
 *  },
 *  "options": {
 *      "ordered": true
 *  }
 * },
 * {
 *  "op": "insertOne",
 *  "filter": {
 *      "blah": "yack"
 *  },
 *  "insert": {
 *      "$set": { "blah": "shmack" }
 *  },
 *  "options": {
 *      "ordered": true
 *  }
 * }]
*/

const Action = require("./action");
const config = require("config");
const MongoClient = require('mongodb').MongoClient;

class Mongo extends Action {
    constructor(...params) {
        super(...params);
        this.mongodb_connected = false;
        return this.run.bind(this);
    }

    connect() {
        const self = this;
        return new Promise((resolve, reject) => {
            MongoClient.connect(config.api.mongo.connection_string, { useUnifiedTopology: true }, (err, client) => {
                if (!client) return reject(err);
                if (err) {
                    return reject(err);
                } 
                self.client = client;
                self.mongodb_connected = true;
                self.db = client.db(client.s.options.dbName);
                self.collection = self.db.collection(self.instructions.collection);
                return resolve();
            });
        })
    }

    disconnect() {
        this.client.close();
        this.mongodb_connected = false;
    }

    async run(...params) {
        super.run(...params);
        try {
            if (!this.mongodb_connected) {
                await this.connect();
            }
            if (this.instructions.prep) {
                this.data = await this.instructions.prep(this.data);
            }
            if (!Array.isArray(this.data)) {
                this.data = [this.data];
            }
            const results = [];
            for (let instruction of this.data) {
                if (instruction.op === "updateOne" || instruction.op === "updateMany") {
                    const result = await this.collection[instruction.op](instruction.filter, instruction.update, instruction.options || {});
                    results.push(result);
                }
                if (instruction.op === "insert" || instruction.op === "insertOne" || instruction.op === "insertMany") {
                    const result = await this.collection[instruction.op](instruction.insert, instruction.options || {});
                    results.push(result);
                }
            }
            this.disconnect();
            this.data = results;
            return this.data;
        } catch (err) {
            console.log("Oops");
            console.error(err);
            return Promise.reject(err);
        }
    }
}

module.exports = Mongo;