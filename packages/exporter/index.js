const MongoKafkaStream = require("./libs/mongo-kafka-stream");
const KafkaMysqlStream = require("./libs/kafka-mysql-stream");
const { Command } = require('commander');
const program = new Command();

program
.option('-c, --collections <collections...>', 'JXP collection')
.option('-s, --setup', 'setup')
.option('-u, --upload', 'upload')
.option('-d, --daemon', 'daemon mode');

program.parse(process.argv);
const options = program.opts();

const main = async () => {
    try {
        // console.log(options);
        if (!options.collections) throw "Collection required";
        const collections = options.collections;
        const mongo_kafka_stream = new MongoKafkaStream();
        const kafka_mysql_stream = new KafkaMysqlStream();
        // if (options.setup) {
        //     console.log(`Setting up ${collection}`);
        //     await jxp2bq.create_table()
        //     await jxp2bq.update_table()
        // }
        // if (options.upload) {
        //     console.log(`Uploading ${collection}`);
        //     await jxp2bq.upload_collection()
        // }
        if (options.daemon) {
            await mongo_kafka_stream.connect();
            kafka_mysql_stream.run();
            for (let collection of collections) {
                console.log(`Running daemon ${collection}`);
                mongo_kafka_stream.run(collection);
            }
        } else {
            process.exit(0);
        }
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}

main();