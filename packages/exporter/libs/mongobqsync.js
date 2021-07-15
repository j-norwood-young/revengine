const config = require("config");
const { MongoClient } = require("mongodb");
const JXP2BQ = require("./jxp2bq");

class MongoBQSync {
    constructor(collection, table) {
        try {
            this.client = new MongoClient(config.api.mongo.connection_string);
            this.jxp2bq = new JXP2BQ({ collection, table });
            this.table = table;
            this.changeStream = null;
            this.collection = collection;
        } catch(err) {
            console.error(err);
        }
    }

    async run() {
        try {
            await this.client.connect();
            const database = await this.client.db();
            const collection = database.collection(this.table);
            // open a Change Stream on the "movies" collection
            this.changeStream = collection.watch();
            // set up a listener when change events are emitted
            this.changeStream.on("change", async evt => {
                try {
                    console.log(evt);
                    if (evt.operationType === "insert") {
                        await this.jxp2bq.insert_row(this.collection, evt.fullDocument, evt._id._data);
                    } else if (evt.operationType === "update") {
                        console.log("Update");
                        await this.jxp2bq.update_row(this.collection, evt.documentKey._id, evt.updateDescription.updatedFields, evt._id._data);
                    }
                } catch(err) {
                    console.log(JSON.stringify(err, null, "   "));
                }
            });
            await new Promise(resolve => {
                // Keep us listening...
            });
        } catch(err) {
            console.error(err)
        } finally {
            await this.client.close();
        }
    }
}

module.exports = MongoBQSync;