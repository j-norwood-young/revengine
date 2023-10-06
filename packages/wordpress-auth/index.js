const {Command} = require("commander");
const CryptoJS = require("crypto-js");
const padZeroPadding = require('crypto-js/pad-zeropadding');
require("dotenv").config();
const config = require("config");
const expect = require("expect");
const Apihelper = require("jxp-helper");
const apihelper = new Apihelper({ server: config.api.server, apikey: process.env.APIKEY });
const axios = require("axios");
const tbp = require('@revengine/mailer/touchbase');

const program = new Command();
program
    .option('-t, --test', 'test encryption')
    .option('-l, --synclist <listid>', 'sync a TouchBasePro list with encrypted identification data')
    .option('-u, --syncreader <readerid>', 'sync a RevEngine Reader\'s encrypted identification data with TouchBasePro')
    .option('-g, --generate <readerid>', 'generate encrypted identification data for a RevEngine Reader, accepts email address or reader id')
    .parse(process.argv);

const options = program.opts();

if (require.main === module && !options.mailer) {
    // console.log("Loading wordpress-auth...");
    // Do some work here
}

const encrypt = data => {
    // return Buffer.from(CryptoJS.AES.encrypt(JSON.stringify(data), process.env.HEX_KEY, { iv: process.env.IV }).toString(), "utf8").toString("base64");
    const key = CryptoJS.enc.Hex.parse(process.env.HEX_KEY);
    const iv = CryptoJS.enc.Hex.parse(process.env.IV);
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), key, { iv, padding: padZeroPadding }).toString();
    return Buffer.from(encrypted, "utf8").toString("base64");
}

const decrypt = encrypted => {
    const key = CryptoJS.enc.Hex.parse(process.env.HEX_KEY);
    const iv = CryptoJS.enc.Hex.parse(process.env.IV);
    const decrypted = CryptoJS.AES.decrypt(Buffer.from(encrypted, "base64").toString("utf8"), key, { iv, padding: padZeroPadding }).toString(CryptoJS.enc.Utf8);
    return JSON.parse(decrypted);
}

if (options.test) {
    console.log("Testing encryption...");
    const test_data = {
        "wordpress_id": "12345",
        "revengine_id": "67890",
        "email": "test@test.com"
    }
    const encrypted = encrypt(test_data);
    console.log({encrypted});
    const decrypted = decrypt(encrypted);
    console.log({decrypted});
    expect(decrypted).toEqual(test_data);
    console.log("Encryption test passed.");
}

const add_reader_to_list = async (reader_id, list_id, custom_fields = {}) => {
    try {
        console.log("add_reader_to_list", reader_id, list_id);
        const reader = (await apihelper.getOne("reader", reader_id)).data;
        const list = (await apihelper.getOne("touchbaselist", list_id)).data;
        await tbp.ensure_custom_fields(list.list_id, ["auto_login_id"]);
        await tbp.ensure_custom_fields(list.list_id, Object.keys(custom_fields));
        const data = {
            "wordpress_id": reader.wordpress_id,
            "revengine_id": reader._id,
            "email": reader.email
        }
        const custom_fields_data = {
            "auto_login_id": encrypt(data),
            ...custom_fields
        }
        console.log("custom_fields_data", custom_fields_data);
        const result = await tbp.add_readers_to_list([{
            email: reader.email,
            first_name: reader.first_name,
            last_name: reader.last_name,
            custom_fields: custom_fields_data
        }], list.list_id);
        if (config.debug) console.log(result);
        return result;
    } catch(err) {
        console.error(err);
    }
}

const sync_reader = async (reader_id) => {
    try {
        const reader = (await apihelper.getOne("reader", reader_id)).data;
        const data = {
            "wordpress_id": reader.wordpress_id,
            "revengine_id": reader._id,
            "email": reader.email
        }
        console.log("Syncing reader", reader_id, reader.email);
        const encrypted = encrypt(data);
        const touchbase_subscriber = (await apihelper.get("touchbasesubscriber", { "filter[email]": `$regex:/${reader.email}/i`, "populate": "touchbaselist" })).data;
        console.log(touchbase_subscriber.length, "TouchBasePro subscribers found for", reader.email);
        for (const subscriber of touchbase_subscriber) {
            const list = subscriber.touchbaselist;
            // console.log(list.name, list.list_id);
            // try {
            //     const result = await axios.put(`https://api.touchbasepro.com/email/lists/${list.list_id}/customfields/[auto_login_id]`, {
            //         "FieldName": "auto_login_id",
            //         // "DataType": "Text",
            //         "VisibleInPreferenceCenter": false,
            //     }, {
            //         headers: {
            //             Authorization: `Bearer ${process.env.TOUCHBASE_BEARER_APIKEY}`
            //         },
            //     });
            //     console.log(result.status, result.data);
            // } catch (err) {
            //     console.log(err.response.data);
            // }
            try {
                const url = `https://api.touchbasepro.com/email/subscribers/${list.list_id}?email=${reader.email}`;
                const result = await axios.put(url, {
                    // "EmailAddress": reader.email,
                    // "Name": reader.name,
                    CustomFields: [
                        {
                            "Key": "auto_login_id",
                            "Value": encrypted
                        }
                    ],
                    "ConsentToTrack": "Unchanged"
                }, {
                    headers: {
                        Authorization: `Bearer ${process.env.TOUCHBASE_BEARER_APIKEY}`
                    },
                });
                if (config.debug) console.log(result.status, result.data);
            } catch(err) {
                console.log(err.response.status, err.response.statusText);
                console.log(err.response.data);
            }
        }
    } catch(err) {
        console.error(err);
    }
}

const sync_list = async (list_id) => {
    try {
        const list = (await apihelper.getOne("touchbaselist", list_id)).data;
        await tbp.ensure_custom_fields(list.list_id, ["auto_login_id"]);
        const pipeline = [
            { $match: { "list_id": `ObjectId(\"${list_id}\")` } },
            { $lookup: { from: "readers", localField: "email", foreignField: "email", as: "reader" } },
            { $unwind: "$reader" },
            { $project: { _id: 0, "wordpress_id": "$reader.wordpress_id", "revengine_id": "$_id", "email": "$reader.email", "first_name": "$reader.first_name",  "last_name":"$reader.last_name", "reader_id": "$reader._id", "data": 1 } },
        ]
        // console.log(pipeline);
        const subscribers = (await apihelper.aggregate("touchbasesubscriber", pipeline)).data;
        // console.log(subscribers);
        // const subscribers = (await apihelper.get("touchbasesubscriber", { "filter[list_id]": list._id })).data;
        let subscribers_to_update = subscribers.filter(subscriber => {
            if (!subscriber.data) return;
            for (let data of subscriber.data) {
                if (data.Key === "auto_login_id") {
                    return false;
                }
            }
            return true;
        })
        console.log(`Subscribers to update: ${subscribers_to_update.length} / ${subscribers.length}`);
        const update = subscribers_to_update.map(subscriber => {
            const data = {
                "wordpress_id": subscriber.wordpress_id,
                "revengine_id": subscriber.reader_id,
                "email": subscriber.email
            }
            const encrypted = encrypt(data);
            return {
                email: subscriber.email,
                first_name: subscriber.first_name || "",
                last_name: subscriber.last_name || "",
                custom_fields: {
                    auto_login_id: encrypted
                }
            }
        });
        // console.log(JSON.stringify(update, null, 2));
        const result = await tbp.add_readers_to_list(update, list.list_id);
        console.log(result);
    } catch(err) {
        console.error(JSON.stringify(err.response.data, null, 2));
    }
}

const force_sync_reader = async (reader_id, list_id) => {
    try {
        console.log("Syncing reader", reader_id, list_id);
        const reader = (await apihelper.getOne("reader", reader_id)).data;
        const data = {
            "wordpress_id": reader.wordpress_id,
            "revengine_id": reader._id,
            "email": reader.email
        }
        const list = (await apihelper.getOne("touchbaselist", list_id)).data;
        await tbp.ensure_custom_fields(list.list_id, ["auto_login_id"]);
        const encrypted = encrypt(data);
        const url = `https://api.touchbasepro.com/email/subscribers/${list.list_id}?email=${reader.email}`;
        const result = await axios.put(url, {
            CustomFields: [
                {
                    "Key": "auto_login_id",
                    "Value": encrypted
                }
            ],
            "ConsentToTrack": "Unchanged"
        }, {
            headers: {
                Authorization: `Bearer ${process.env.TOUCHBASE_BEARER_APIKEY}`
            },
        });
        if (config.debug) console.log(result.status, result.data);
    } catch(err) {
        console.log(err.response.status, err.response.statusText);
        console.log(err.response.data);
    }
}

async function generate_by_id(reader_id) {
    const reader = (await apihelper.getOne("reader", reader_id)).data;
    if (!reader) throw new Error(`No reader found for id ${reader_id}`);
    const data = {
        "wordpress_id": reader.wordpress_id,
        "revengine_id": reader._id,
        "email": reader.email
    }
    return encrypt(data);
}

async function generate_by_email (email) {
    const readers = (await apihelper.get("reader", {"filter[email]": email, fields: "wordpress_id,revengine_id,email"})).data;
    if (readers.length === 0) throw new Error(`No readers found for email ${email}`);
    const reader = readers[0];
    const data = {
        "wordpress_id": reader.wordpress_id,
        "revengine_id": reader._id,
        "email": reader.email
    }
    return encrypt(data);
}

async function generate(param) {
    try {
        if (param.includes("@")) {
            console.log(await generate_by_email(param));
        } else {
            console.log(await generate_by_id(param));
        }
    } catch(err) {
        console.log(err);
        process.exit(1);
    }
}

if (options.synclist && options.syncreader) {
    force_sync_reader(options.syncreader, options.synclist);
} else {
    if (options.syncreader) {
        sync_reader(options.syncreader);
    }

    if (options.synclist) {
        sync_list(options.synclist);
    }
}

if (options.generate) {
    generate(options.generate);
}

module.exports = {
    sync_reader,
    sync_list,
    encrypt,
    decrypt,
    add_reader_to_list,
    force_sync_reader
}