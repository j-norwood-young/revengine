const {Command} = require("commander");
const CryptoJS = require("crypto-js");
const padZeroPadding = require('crypto-js/pad-zeropadding');
require("dotenv").config();
const config = require("config");
const expect = require("expect");
const Apihelper = require("jxp-helper");
const apihelper = new Apihelper({ server: config.api.server, apikey: process.env.APIKEY });
const axios = require("axios");

const program = new Command();
program
    .option('-t, --test', 'test encryption')
    .option('-l, --synclist <listid>', 'sync a TouchBasePro list with encrypted identification data')
    .option('-u, --syncreader <readerid>', 'sync a RevEngine Reader\'s encrypted identification data with TouchBasePro')
    .parse(process.argv);

const options = program.opts();

if (require.main === module && !options.mailer) {
    console.log("Loading wordpress-auth...");
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

const sync_reader = async (reader_id) => {
    try {
        const reader = (await apihelper.getOne("reader", reader_id)).data;
        const data = {
            "wordpress_id": reader.wordpress_id,
            "revengine_id": reader._id,
            "email": reader.email
        }
        const encrypted = encrypt(data);
        const touchbase_subscriber = (await apihelper.get("touchbasesubscriber", { "filter[email]": `$regex:/${reader.email}/i`, "populate": "touchbaselist" })).data;
        for (const subscriber of touchbase_subscriber) {
            const list = subscriber.touchbaselist;
            console.log(list.name, list.list_id);
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
                console.log(result.status, result.data);
            } catch(err) {
                console.log(err.response.status, err.response.statusText);
                console.log(err.response.data);
            }
        }
        // console.log(touchbase_subscriber);
        console.log(encrypted);
    } catch(err) {
        console.error(err);
    }
}

if (options.syncreader) {
    sync_reader(options.syncreader);
}