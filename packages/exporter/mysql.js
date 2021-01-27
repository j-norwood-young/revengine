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
    .option('-c, --collection <name>', 'collection name')
    .option('-t, --truncate', 'truncate table and do a complete recopy of the collection')
    ;

program.parse(process.argv);

// Define our relationships between JXP and MySql

const mysql_date_format = 'YYYY-MM-DD HH:mm:ss';
const format_date = d => d ? moment(d).format(mysql_date_format) : null;

var articles = [];
const getSource = d => {
    if (!d.meta_data) return null;
    let source = d.meta_data.find(md => (md.key === "ossc_tracking"));
    if (!source) return null;
}

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

const defs = [
    {
        collection: "article",
        table: "articles",
        relationships: {
            uid: d => d._id,
            post_id: d => d.post_id,
            slug: d => d.urlid,
            date_published: d => format_date(d.date_published),
            date_modified: d => format_date(d.date_modified),
            content: d => (d.content) ? d.content.replace(/[^\x20-\x7E]+/g, '') : "",
            title: d => d.title,
            excerpt: d => d.excerpt,
            type: d => d.type,
            tags: d => d.tags.join(","),
            sections: d => d.sections.join(","),
            date_updated: d => moment(d.updatedAt).format(mysql_date_format),
        }
    },
    {
        collection: "reader",
        table: "readers",
        relationships: {
            uid: d => d._id,
            wordpress_id: d => d.wordpress_id,
            email_md5: d => (d.email) ? crypto.createHash("md5").update(d.email).digest("hex") : null,
            paying_customer: d => d.paying_customer,
            user_registered: d => d.user_registered ? moment(d.user_registered).format(mysql_date_format) : null,
            date_updated: d => moment(d.updatedAt).format(mysql_date_format),
        }
    },
    {
        collection: "woocommerce_order",
        table: "woocommerce_orders",
        relationships: {
            uid: d => d._id,
            wordpress_id: d => d.customer_id,
            ip_address: d => d.customer_ip_address,
            user_agent: d => d.customer_user_agent,
            date_completed: d => format_date(d.date_completed),
            date_created: d => format_date(d.date_created),
            date_paid: d => format_date(d.date_paid),
            payment_method: d => d.payment_method,
            product_name: d => d.products[0] ? d.products[0].name : null,
            total: d => d.total,
            date_updated: d => format_date(d.updatedAt),
        }
    },
    {
        collection: "woocommerce_subscription",
        table: "woocommerce_subscriptions",
        relationships: {
            uid: d => d._id,
            wordpress_id: d => d.customer_id,
            status: d => d.status,
            product_total: d => d.total,
            product_name: d => (d.products.length) ? d.products[0].name : 0,
            billing_period: d => d.billing_period,
            schedule_start: d => format_date(d.schedule_start),
            suspension_count: d => d.suspension_count,
            payment_method: d => d.payment_method,
            source_source: d => {
                const source = getSource(d);
                if (source) return source.value.utmSource;
                return null;
            },
            source_medium: d => {
                const source = getSource(d);
                if (source) return source.value.utmMedium;
                return null;
            },
            source_campaign: d => {
                const source = getSource(d);
                if (source) return source.value.utmCampaign;
                return null;
            },
            source_term: d => {
                const source = getSource(d);
                if (source) return source.value.utmTerm;
                return null;
            },
            source_device: d => {
                const source = getSource(d);
                if (source) return source.value.utmDevice;
                return null;
            },
            date_updated: d => format_date(d.updatedAt),
        }
    },
    {
        collection: "touchbaseevent",
        table: "touchbase_events",
        relationships: {
            email_md5: d => (d.email) ? crypto.createHash("md5").update(d.email.toLowerCase()).digest("hex") : null,
            timestamp: d => moment(d.timestamp).format(mysql_date_format),
            event: d => d.event,
            url: d => (d.url) ? d.url.substring(0, 255) : null,
            ip_address: d => d.ip_address,
            latitude: d => d.latitude,
            longitude: d => d.longitude,
            city: d => d.city,
            region: d => d.region,
            country_name: d => d.country_name,
            country_code: d => d.country_code,
            date_updated: d => moment(d.updatedAt).format(mysql_date_format),
            article_uid: d => {
                try {
                    if (!d.url) return null;
                    const article = articles.find(a => d.url.includes(a.urlid));
                    if (article) {
                        return article._id;
                    }
                    return null;
                } catch(err) {
                    return null;
                }
            }
        }
    }
]

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
            const result = await query(connection, sql);
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
        if (program.collection) {
            limited_defs = defs.filter(def => def.collection === program.collection);
        }
        if (!limited_defs.length) throw `Collection ${program.collection} not found`;
        // Find time this collection was last updated
        for (let def of limited_defs) {
            def.last_updated = await findLastUpdated(def);
        }
        // Populate global articles
        articles = (await apihelper.get("article", { "fields": "_id,urlid" })).data;
        console.log("Found", articles.length, "articles");
        // Calculate total size
        for (let def of limited_defs) {
            if (program.truncate) {
                await truncate(def);
            }
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