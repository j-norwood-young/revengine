const mysql = require("mysql");
const config = require("config");
const JXPHelper = require("jxp-helper");
require("dotenv").config();
const apihelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });
const util = require('util');
const crypto = require("crypto");
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
    .option('-c, --collection <name>', 'collection name');

program.parse(process.argv);

// Define our relationships between JXP and MySql

const mysql_date_format = 'YYYY-MM-DD HH:mm:ss';
const defs = [
    {
        collection: "reader",
        table: "readers",
        relationships: {
            uid: d => d._id,
            wordpress_id: d => d.wordpress_id,
            email_md5: d => (d.email) ? crypto.createHash("md5").update(d.email).digest("hex") : null,
            date_updated: d => moment(d.updatedAt).format(mysql_date_format)
        }
    },
    {
        collection: "touchbaseevent",
        table: "touchbase_events",
        relationships: {
            email_md5: d => (d.email) ? crypto.createHash("md5").update(d.email).digest("hex") : null,
            timestamp: d => moment(d.timestamp).format(mysql_date_format),
            event: d => d.event,
            url: d => d.url,
            ip_address: d => d.ip_address,
            latitude: d => d.latitude,
            longitude: d => d.longitude,
            city: d => d.city,
            region: d => d.region,
            country_name: d => d.country_name,
            country_code: d => d.country_code,
            date_updated: d => moment(d.updatedAt).format(mysql_date_format)
        }
    }
]

// Find last insert into MySql
const findLastUpdated = async def => {
    try {
        const sql = `SELECT date_updated FROM ${def.table} ORDER BY date_updated DESC LIMIT 1;`
        const result = await query(connection, sql);
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
                let data = (await apihelper.get(def.collection, { "limit": size, page: page++, "sort[updatedAt]": 1, "filter[updatedAt]": `$gt:${new Date(def.last_updated)}`  })).data;
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
            const result = await query(connection, sql);
            // console.log(result);
            bar1.increment();
            callback();
        } catch(err) {
            console.error(err);
            this.destroy();
            callback(err);
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
        if (program.collection) {
            limited_defs = defs.filter(def => def.collection === program.collection);
        }
        if (!limited_defs.length) throw `Collection ${program.collection} not found`;
        for (let def of limited_defs) {
            def.last_updated = await findLastUpdated(def);
        }
        // Calculate total size
        for (let def of limited_defs) {
            def.count = await apihelper.count(def.collection, { "filter[updatedAt]": `$gt:${ new Date(def.last_updated) }`});
            max += def.count;
        }
        bar1.start(max, 0);
        for (let def of limited_defs) {
            await fetchRecords(def).pipe(convertRecords).pipe(saveRecords).on("finish", () => {
                connection.end();
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