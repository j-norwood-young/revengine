const config = require("config");
const { MongoClient } = require("mongodb");
const Kafka = require('@revengine/common/kafka');
const pluralize = require("mongoose-legacy-pluralize");

class MongoKafkaStream {
    constructor() {
        try {
            this.client = new MongoClient(config.api.mongo.connection_string);
            this.changeStream = null;
        } catch(err) {
            console.error(err);
        }
    }

    async connect() {
        try {
            this.producer = new Kafka.KafkaProducer({ topic: "mongodb_stream", debug: false });
            await this.client.connect();
            this.database = await this.client.db();
        } catch(err) {
            console.error(err)
        }
    }

    run(collection) {
        try {
            const table = pluralize(collection);
            const dbcollection = this.database.collection(table);
            this.changeStream = dbcollection.watch();
            this.changeStream.on("change", async evt => {
                try {
                    // console.log(evt);
                    if (evt.operationType === "insert") {
                        await this.producer.send({ event: "insert", table, document: evt.fullDocument });
                    } else if (evt.operationType === "update") {
                        await this.producer.send({ event: "update", table, _id: evt.documentKey._id, updated_fields: evt.updateDescription.updatedFields });
                    }
                } catch(err) {
                    console.log(JSON.stringify(err, null, "   "));
                }
            });
        } catch(err) {
            console.error(err)
        }
    }
}

module.exports = MongoKafkaStream;