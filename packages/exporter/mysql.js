const mysql = require("mysql");
const config = require("config");
const JXPHelper = require("jxp-helper");
require("dotenv").config();
const apihelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });
const Stream = require("stream")
const moment = require("moment");
const cliProgress = require('cli-progress');
const bar1 = new cliProgress.SingleBar({
    etaBuffer: 1000
}, cliProgress.Presets.shades_classic);
let max = 100;
const { Command } = require('commander');

const program = new Command();
program
    .option('-c, --collection <name>', 'collection name')
    .option('-t, --truncate', 'truncate table and do a complete recopy of the collection')
    ;

program.parse(process.argv);

const options = program.opts();

// Define our relationships between JXP and MySql

var articles = [];

// Truncate table
const truncate = async def => {
    try {
        const sql = `TRUNCATE ${def.table};`
        await query(connection, sql);
        console.log(`Truncated ${def.table}`);
    } catch(err) {
        return Promise.reject(err);
    }
}

const defs = require("./libs/conversions");

// Find last insert into MySql
const findLastUpdated = async def => {
    try {
        const sql = `SELECT date_updated FROM ${def.table} ORDER BY date_updated DESC LIMIT 1;`
        const result = await query(connection, sql);
        if (!result.length) return 0;
        return result.pop().date_updated;
    } catch(err) {
        return Promise.reject(err);
    }
}

// Fetch based on updatedAt - batches of per_chunk

function fetchRecords(def) {
    var page = 0;
    const stream = new Stream.Readable({
        objectMode: true,
        highWaterMark: 5000,
        async read(size) {
            try {
                let data = (await apihelper.get(def.collection, { "limit": size, page: page++, "sort[updatedAt]": 1, "filter[updatedAt]": `$gte:${new Date(def.last_updated)}`  })).data;
                if (!data.length) stream.push(null);
                for (let record of data) {
                    stream.push({ def, record });
                }
            } catch(err) {
                console.error(err);
                stream.destroy();
            }
        }
    })
    return stream;
}

const upsert = (table, record) => {
    const keys = Object.keys(record);
    const values = Object.values(record);
    let update = [];
    for (key of keys) {
        update.push(`${key} = ${ connection.escape(record[key])}`);
    }
    return `INSERT INTO ${table} (${ keys.join(",") }) VALUES (${ values.map(d => connection.escape(d)).join(",") }) ON DUPLICATE KEY UPDATE ${ update.join(",") }`;
}

// Convert into our Sql definition
const convertRecords = new Stream.Transform({
    objectMode: true,
    transform(data, encoding, callback) {
        const def = data.def;
        const record = data.record;
        const new_record = {};
        for (let field in def.relationships) {
            new_record[field] = def.relationships[field](record);
        }
        const sql = upsert(def.table, new_record);
        this.push(sql);
        callback(null);
    },

    flush(callback) {
        callback();
    }
});

// Convert into our Sql definition
const log = new Stream.Transform({
    objectMode: true,
    transform(data, encoding, callback) {
        console.log(data);
        this.push(data);
        callback(null);
    },

    flush(callback) {
        callback();
    }
});

// REPLACE INTO our Sql table
const saveRecords = new Stream.Writable({
    async write(chunk, encoding, callback) {
        try {
            const sql = chunk.toString();
            // console.log({ sql });
            try {
                const result = await query(connection, sql);
            } catch(err) {
                console.error(err);
            }
            // console.log(result);
            bar1.increment();
            callback();
        } catch(err) {
            console.error(err);
            // this.destroy();
            // callback(err);
        }
    }
})

const query = (connection, query) => {
    return new Promise((resolve, reject) => {
        connection.query(query, (err, result) => {
            if (err) return reject(err);
            return resolve(result);
        })
    })
}

const connection = mysql.createConnection({
    host: config.mysql.host || "localhost",
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: config.mysql.database || "revengine"
});

const mysqlConnect = (connection) => {
    return new Promise((resolve, reject) => {
        connection.connect(err => {
            if (err) return reject(err);
            console.log("Connected to MySql");
            resolve();
        });
    })
}

const main = async() => {
    try {
        const timeStart = new Date();
        await mysqlConnect(connection);
        let limited_defs = defs;
        if (options.collection) {
            limited_defs = defs.filter(def => def.collection === options.collection);
        }
        console.log({ collection: options.collection });
        if (!limited_defs.length) throw `Collection ${options.collection} not found`;
        // Truncate, then Find time this collection was last updated
        for (let def of limited_defs) {
            if (options.truncate) {
                await truncate(def);
                def.last_updated = "1977-01-01";
            } else {
                def.last_updated = await findLastUpdated(def);
            }
        }
        // console.log(limited_defs);
        // Populate global articles
        articles = (await apihelper.get("article", { "fields": "_id,urlid" })).data;
        console.log("Found", articles.length, "articles");
        // Calculate total size
        for (let def of limited_defs) {
            def.count = await apihelper.count(def.collection, { "filter[updatedAt]": `$gte:${ new Date(def.last_updated) }`});
            max += def.count;
        }
        bar1.start(max, 0);
        for (let def of limited_defs) {
            await fetchRecords(def).pipe(convertRecords).pipe(saveRecords).on("finish", () => {
                connection.end();
                console.log();
                console.log(moment.duration(new Date() - timeStart).asSeconds(), "seconds");
            });
        }
        // const result = await query(connection, 'SELECT 1 + 1 AS solution');
        // console.log(result);
    } catch(err) {
        console.error(err);
    }
}

main();