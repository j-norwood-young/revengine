const express = require('express');
const router = express.Router();
const config = require("config");
const moment = require("moment");
const mailer = require("@revengine/mailer");
const wordpress_auth = require("@revengine/wordpress_auth");

const JXPHelper = require("jxp-helper");
const { 
    run_transactional, 
    // add_readers_to_list, 
    // create_list, 
    // get_touchbase_lists, 
    // get_touchbase_list, 
    ensure_custom_fields 
} = require('@revengine/mailer/touchbase');
const { 
    get_lists, 
    get_list,
    create_list,
    add_readers_to_list,
} = require('@revengine/mailer/sailthru');

const apihelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });

const tbp_auth = {
    auth: {
        username: process.env.TOUCHBASE_APIKEY,
        password: "x"
    }
};


router.use("/", async(req, res, next) => {
    res.locals.pg = "mails";
    next();
})

router.get("/", async (req, res) => {
    res.render("mail", { title: "Mails" });
})

router.get("/reports", async (req, res) => {
    res.send({
        reports: mailer.mailer_names
    })
})

// Testing Sailthru
router.get("/lists", async (req, res) => {
    try {
        const lists = await get_lists();
        res.send(lists);
        // res.render("mail/lists", { title: "Mailing Lists", lists });
    } catch(err) {
        console.error(err);
        res.status(500).send(err);
    }
});

router.get("/individual", async (req, res) => {
    try {
        const touchbasetransactionals = (await req.apihelper.get("touchbasetransactional", { "sort[name]": 1 })).data;
        res.render("mail/individual", { touchbasetransactionals, title: "Send Individual Mail"});
    } catch(err) {
        console.error(err);
        res.status(500).render("error", {message: err.toString()});
    }
})

router.post("/individual", async (req, res) => {
    try {
        let to = req.body.to || req.body.reader_email;
        const result = await run_transactional(req.body.reader_email, to, req.body.touchbasetransactional);
        const touchbasetransactionals = (await req.apihelper.get("touchbasetransactional", { "sort[name]": 1 })).data;
        res.render("mail/individual", { touchbasetransactionals, title: "Send Individual Mail", message: { type: "info", msg: "Email sent" }});
    } catch(err) {
        console.error(err);
        res.send(err.toString());
    }
})

router.get("/group", async (req, res) => {
    try {
        const touchbasetransactionals = (await req.apihelper.get("touchbasetransactional", { "sort[name]": 1 })).data;
        const labels = (await req.apihelper.get("label", { "sort[name]": 1 })).data;
        const mailruns = (await req.apihelper.get("mailrun", { "sort[createdAt]": -1 })).data;
        res.render("mail/group", { touchbasetransactionals, labels, mailruns, title: "Send Group Mail"});
    } catch(err) {
        console.error(err);
        res.status(500).render("error", {message: err.toString()});
    }
})

router.post("/group", async (req, res) => {
    try {
        let label_id = req.body.label_id;
        let mailrun_id = req.body.mailrun;
        let mailrun_queued_reader_ids = [];
        let mailrun_sent_reader_ids = [];
        if (mailrun_id === "new") {
            let mailrun_name = req.body.new_mailrun_name;
            if (!mailrun_name) throw "New Mailrun Name required";
            let mailrun_code = req.body.new_mailrun_code;
            if (!mailrun_code) throw "New Mailrun Code required";
            let touchbasetransactional_id = req.body.touchbasetransactional_id;
            if (!touchbasetransactional_id) throw "New Transaction Mail required";
            mailrun_id = (await req.apihelper.post("mailrun", { name: mailrun_name, code: mailrun_code, touchbasetransactional_id  })).data._id;
        } else {
            const existing_mailrun = (await req.apihelper.getOne("mailrun", mailrun_id, { "fields": "queued_reader_ids,sent_reader_ids" })).data;
            mailrun_queued_reader_ids = existing_mailrun.queued_reader_ids;
            mailrun_sent_reader_ids = existing_mailrun.sent_reader_ids;
        }
        await req.apihelper.call("label", "apply_label", { id: label_id }); // Nice and fresh!
        const reader_ids = (await req.apihelper.get("reader", { "filter[label_id]": label_id, "fields": "_id" })).data.map(reader => reader._id);
        // Ensure we don't have repeated readers
        const queued_reader_ids = new Set([...reader_ids, ...mailrun_queued_reader_ids]);
        // Don't send if reader already received in this mailrun
        for(let remove_reader of mailrun_sent_reader_ids) {
            queued_reader_ids.delete(remove_reader);
        }
        // console.log(queued_reader_ids);
        await req.apihelper.put("mailrun", mailrun_id, { queued_reader_ids: [...queued_reader_ids], state: "due" });
        // await run_mailrun(mailrun_id);
        // const result = await run_transactional_group(req.body.reader_email, to, req.body.touchbasetransactional);
        const touchbasetransactionals = (await req.apihelper.get("touchbasetransactional", { "sort[name]": 1 })).data;
        const labels = (await req.apihelper.get("label", { "sort[name]": 1 })).data;
        const mailruns = (await req.apihelper.get("mailrun", { "sort[createdAt]": -1 })).data;
        res.render("mail/group", { touchbasetransactionals, labels, mailruns, title: "Send Group Mail", message: { type: "info", msg: "Mailrun Queued" }});
    } catch(err) {
        console.error(err);
        res.status(500).render("error", {message: err.toString()});
    }
})

router.get("/mailrun/progress/:mailrun_id", async (req, res) => {
    try {
        // console.log(req.params.mailrun_id);
        const mailrun = (await req.apihelper.getOne("mailrun", req.params.mailrun_id)).data;
        res.render("mail/mailrun", { mailrun, title: mailrun.name });
    } catch(err) {
        console.error(err);
        res.status(500).render("error", {message: err.toString()});
    }
})

router.get("/mailrun/progressbar_data/:mailrun_id", async (req, res) => {
    try {
        const mailrun = (await req.apihelper.getOne("mailrun", req.params.mailrun_id)).data;
        const total = mailrun.queued_reader_ids.length + mailrun.sent_reader_ids.length;
        const start_time = moment(mailrun.start_time);
        const now = moment();
        const diff = now.diff(start_time, "seconds");
        const per_sec = mailrun.sent_reader_ids.length / diff;
        const time_remaining = mailrun.queued_reader_ids.length * per_sec;
        const time_remaining_human = moment.duration(time_remaining, "seconds").humanize();
        res.send({ perc: mailrun.sent_reader_ids.length / total * 100, remaining: mailrun.queued_reader_ids.length, complete: mailrun.sent_reader_ids.length, total, start_time: mailrun.start_time, running_time: diff, per_sec, time_remaining, time_remaining_human })
    } catch(err) {
        console.error(err);
        res.status(500).send({ status: "error", message: err.toString()});
    }
})

// Touchbase List stuff

const get_lists_middleware = async (req, res, next) => {
    try {
        const { lists } = await get_lists();
        res.locals.lists = lists;
        next();
        // const lists = await axios.get(`${config.touchbase.api}`)
    } catch(err) {
        console.error(err);
        res.send(err);
    }
}

router.get("/mailinglist/create", async (req, res) => {
    res.send("TODO");
});

router.get("/mailinglist/list", async (req, res) => {
    res.send("TODO");
});

router.get("/mailinglist/subscribe_by_label/:label_id", get_lists_middleware, async (req, res) => {
    const label = (await req.apihelper.getOne("label", req.params.label_id)).data;
    res.render("mail/select_list", { title: `Add Label "${label.name}" to Touchbase List`});
})

router.get("/mailinglist/subscribe_by_segment/:segment_id", get_lists_middleware, async (req, res) => {
    const segment = (await req.apihelper.getOne("segmentation", req.params.segment_id)).data;
    res.render("mail/select_list", { title: `Add Segment "${segment.name}" to Touchbase List`});
})

router.post("/mailinglist/subscribe_by_label/:label_id", async(req, res) => {
    try {
        const label = (await req.apihelper.getOne("label", req.params.label_id)).data;
        const custom_fields = {
            import_source: "RfvEngine",
            import_label: label.name,
            import_by: req.session.user.data.name,
            import_date: moment().format("YYYY-MM-DD"),
        }
        let list_id = null;
        if (req.body.new_list_name) { // Create list
            list_id = (await create_list(req.body.new_list_name)).list_id;
        } else { // Add to existing list
            list_id = req.body.list_id;
        }
        const list = await get_list(list_id);
        const readers = (await req.apihelper.get("reader", { "filter[label_id]": req.params.label_id, "fields": "email,first_name,last_name,wordpress_id" })).data;
        const result = await subscribe_readers_to_list(readers, list, custom_fields, (req.body.include_vouchers === "on"));
        res.render("mail/select_touchbase_list_success", { title: "Subscription Success", data: result, list_name: list.name });
    } catch(err) {
        console.error(err);
        if (err.response && err.response.data && err.response.data.Message) return res.render("error", {error: { status: err.response.data.Message } });
        res.send(err);
    }
})

async function subscribe_readers_to_list(readers, list, custom_fields = {}, include_vouchers = false, include_autologin = true) {
    try {
        custom_fields = {
            import_source: "RfvEngine",
            import_date: moment().format("YYYY-MM-DD"),
            ...custom_fields 
        };
        // console.log(list);
        const list_id = list.list_id;
        const vouchertypes = (await apihelper.get("vouchertype")).data;
        let fieldnames = [...Object.keys(custom_fields)];
        if (include_vouchers) {
            fieldnames = [...fieldnames, ...vouchertypes.map(v => v.code)];
        }
        if (include_autologin) {
            fieldnames = [...fieldnames, "auto_login_id"];
        }
        // console.log({fieldnames});
        // if (fieldnames.length > 0) {
        //     await ensure_custom_fields(list_id, fieldnames);
        // }
        for (let reader of readers) {
            reader.custom_fields = Object.assign({}, custom_fields);
        }
        if (include_autologin) {
            for (let reader of readers) {
                const reader_data = {
                    "wordpress_id": reader.wordpress_id,
                    "revengine_id": reader._id,
                    "email": reader.email
                }
                if (config.debug) {
                    // console.log(reader_data);
                }
                reader.custom_fields.auto_login_id = wordpress_auth.encrypt(reader_data);
            }
        }
        if (include_vouchers) {
            for (let vouchertype of vouchertypes) {
                // We should first see if the user already has a voucher for this vouchertype and month
                const vouchers = (await apihelper.query("voucher", {
                    "$and": [
                        {
                            "vouchertype_id": vouchertype._id
                        },
                        {
                            "valid_from": {
                                "$gte": moment().startOf("month").format("YYYY-MM-DD")
                            }
                        },
                        {
                            "valid_to": {
                                "$lte": moment().endOf("month").format("YYYY-MM-DD")
                            }
                        }
                    ]
                })).data;
                const empty_vouchers = vouchers.filter(voucher => !voucher.reader_id);
                for (let reader of readers) {
                    let voucher = vouchers.find(voucher => voucher.reader_id === reader._id);
                    if (!voucher) {
                        voucher = empty_vouchers.pop();
                        await apihelper.put("voucher", voucher._id, { "reader_id": reader._id });
                        if (config.debug) {
                            console.log(`Added voucher ${voucher._id} to reader ${reader._id}`);
                        }
                    }
                    reader.custom_fields[vouchertype.code] = voucher.code;
                }
            }
        }
        if (config.debug) {
            console.log(readers);
        }
        const result = await add_readers_to_list(readers, list_id);
        return result;
    } catch(err) {
        return Promise.reject(err);
    }
}

router.post("/mailinglist/subscribe_by_segment/:segment_id", async(req, res) => {
    // try {
    //     const segment = (await req.apihelper.getOne("segmentation", req.params.segment_id)).data;
    //     const custom_fields = {
    //         import_source: "RfvEngine",
    //         import_segment: segment.name,
    //         import_by: req.session.user.data.name,
    //         import_date: moment().format("YYYY-MM-DD"),
    //     }
    //     let list_id = null;
    //     if (req.body.new_list_name) { // Create list
    //         list_id = await create_list(req.body.new_list_name);
    //     } else { // Add to existing list
    //         list_id = req.body.touchbase_list;
    //     }
    //     const list = await get_touchbase_list(list_id);
    //     const readers = (await req.apihelper.get("reader", { "filter[segmentation_id]": req.params.segment_id, "fields": "email,first_name,last_name,wordpress_id" })).data;
    //     const result = await subscribe_readers_to_list(readers, list, custom_fields, (req.body.include_vouchers === "on"));
    //     res.render("mail/select_touchbase_list_success", { title: "Subscription Success", data: result, list_name: list.Title });
    // } catch(err) {
    //     console.error(err);
    //     if (err.response && err.response.data && err.response.data.Message) return res.render("error", {error: { status: err.response.data.Message } });
    //     res.send(err);
    // }
})

router.get("/vouchertest/:segment_id", async(req, res) => {
    try {
        const readers = (await req.apihelper.get("reader", { "filter[segmentation_id]": req.params.segment_id, "fields": "email,first_name,last_name,wordpress_id" })).data;
        ensure_vouchers(readers);
        res.send("Done");
    } catch(err) {
        console.error(err);
        res.send(err)
    }
});

// const ensure_vouchers = async(readers) => {
//     const vouchertypes = (await apihelper.get("vouchertype")).data;
//     const reader_ids = readers.map(reader => reader._id);
//     const vouchers = (await apihelper.query("voucher", {
//         "$and": [
//             {
//                 "valid_from": {
//                     "$gte": moment().startOf("month").format("YYYY-MM-DD")
//                 },
//             },
//             {
//                 "valid_to": {
//                     "$lte": moment().endOf("month").format("YYYY-MM-DD")
//                 }
//             }
//         ]
//     })).data;
//     const empty_vouchers = vouchers.filter(voucher => !voucher.reader_id);
//     const readers_without_vouchers = readers.filter(reader => !vouchers.find(voucher => voucher.reader_id === reader._id));
//     for (let reader of readers_without_vouchers) {
//         for(let vouchertype of vouchertypes) {

//     console.log(readers_without_vouchers);
// }

module.exports = router;