const Action = require("./action");
const config = require("config");
const MongoClient = require('mongodb').MongoClient;

class SaveRaw extends Action {
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
            if (Array.isArray(this.data)) {
                for (let data of this.data) {
                    await this.upsert(this.instructions.key, data);
                }
            } else {
                await this.upsert(this.instructions.key, this.data);
            }
            this.disconnect();
            return this.data;
        } catch (err) {
            console.log("Oops");
            console.error(err);
            return Promise.reject(err);
        }
    }

    async upsert(key, data) {
        const query = {};
        query[key] = data[key];
        try {
            const result = await this.collection.updateOne(query, { $set: data }, { upsert: true });
            this.log(result);
        } catch(err) {
            return Promise.reject(err);
        }
    }
}

module.exports = SaveRaw;