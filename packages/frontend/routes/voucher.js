import express from 'express';
const router = express.Router();
import moment from "moment";
import fileUpload from 'express-fileupload';

router.use("/", async(req, res, next) => {
    res.locals.pg = "voucher";
    next();
})

router.get("/", (req, res) => {
    res.render("voucher", { title: "Vouchers" });
})

router.get("/upload", async (req, res) => {
    const vouchertypes = (await req.apihelper.get("vouchertype", { "sort[name]": 1 })).data;
    res.render("voucher/upload", { title: "Upload Vouchers", vouchertypes });
})

router.post("/upload", async (req, res) => {
    try {
        const codes = req.body.codes.split("\n").map(code => code.trim());
        const valid_from = req.body.valid_from;
        const valid_to = req.body.valid_to;
        const vouchertype_id = req.body.vouchertype_id;
        if (!codes) throw "Missing codes";
        if (!valid_from) throw "Missing valid from";
        if (!valid_to) throw "Missing valid to";
        if (!vouchertype_id) throw "Missing voucher type";
        const data = codes.map(code => {
            return {
                code,
                vouchertype_id,
                valid_from,
                valid_to
            }
        })
        const result = await req.apihelper.bulk_postput("voucher", "code", data);
        const vouchertypes = (await req.apihelper.get("vouchertype", { "sort[name]": 1 })).data;
        const message = {
            type: "primary",
            msg: `Uploaded ${codes.length} codes`,
            data: result
        }
        res.render("voucher/upload", { title: "Upload Vouchers", vouchertypes, message });
    } catch(err) {
        console.error(err);
        res.status(500).send(err);
    }
})

router.get("/upload_used", async (req, res) => {
    const vouchertypes = (await req.apihelper.get("vouchertype", { "sort[name]": 1 })).data;
    res.render("voucher/upload_used", { title: "Upload Used Vouchers", vouchertypes });
})

router.post("/upload_used", async (req, res) => {
    try {
        const vouchertypes = (await req.apihelper.get("vouchertype", { "sort[name]": 1 })).data;
        const lines = req.body.codes.split("\n").map(code => code.trim());
        const valid_from = req.body.valid_from;
        const valid_to = req.body.valid_to;
        if (!lines) throw "Missing data";
        if (lines.length < 1) throw "Data incomplete";
        if (!valid_from) throw "Missing valid from";
        if (!valid_to) throw "Missing valid to";
        const header = lines.shift();
        const header_cols = header.split("\t");
        if (header_cols.length < 2) throw "Data not tab-seperated";
        if (!header_cols.includes("email")) throw "Missing email";
        const row_data = [];
        for (let line of lines) {
            let line_data = line.split("\t");
            const col_data = {};
            for (let col = 0; col < header_cols.length; col++) {
                col_data[header_cols[col]] = line_data[col];
            }
            row_data.push(col_data);
        }
        
        const data = [];
        for (let row of row_data) {
            // console.log(row_data);
            const reader = (await req.apihelper.get("reader", { "filter[email]": row.email.toLowerCase().trim() })).data.pop();
            // console.log(reader);
            if (!reader) {
                console.log(`Missing reader ${row.email}`);
                continue;
            }
            for (let vouchertype of vouchertypes) {
                const code = row[vouchertype.code];
                if (!code) continue;
                const item = {
                    code,
                    vouchertype_id: vouchertype._id,
                    valid_from,
                    valid_to,
                    reader_id: reader._id
                };
                data.push(item);
            }
        }
        // return res.send(data);
        const result = await req.apihelper.bulk_postput("voucher", "code", data);
        
        const message = {
            type: "primary",
            msg: `Uploaded ${data.length} codes`,
            data: result
        }
        res.render("voucher/upload_used", { title: "Upload Used Vouchers", vouchertypes, message });
    } catch(err) {
        console.error(err);
        res.status(500).send(err);
    }
})

router.get("/assign", async (req, res) => {
    const vouchertypes = (await req.apihelper.get("vouchertype", { "sort[name]": 1 })).data;
    const segments = (await req.apihelper.get("segmentation", { "sort[name]": 1 })).data;
    const months = [];
    for (let i = 0; i < 12; i++) {
        months.push({
            name: moment().add(i, "months").format("MMMM YYYY"),
            value: moment().add(i, "months").toISOString()
        });
    }
    res.render("voucher/assign", { title: "Assign Vouchers", vouchertypes, segments, months });
})

router.post("/assign", async (req, res) => {
    try {
        const vouchertypes = req.body.vouchertypes;
        const segments = req.body.segments;
        const dt = req.body.month;
        if (!vouchertypes) throw "Missing voucher types";
        if (!segments) throw "Missing segments";
        if (! dt) throw "Missing month";
        const month = moment(dt);
        const valid_from = month.startOf("month").format("YYYY-MM-DD");
        const valid_to = month.endOf("month").format("YYYY-MM-DD");
        const readers = (await req.apihelper.get("reader", { "filter[segmentation_id]": segments, "fields": "_id"  })).data;
        const results = [];        
        for (let vouchertype of vouchertypes) {
            console.log("Processing", vouchertype);
            const vouchers = (await req.apihelper.query("voucher", {
                "$and": [
                    {
                        "vouchertype_id": vouchertype
                    },
                    {
                        "valid_from": {
                            "$gte": valid_from
                        }
                    },
                    {
                        "valid_to": {
                            "$lte": valid_to
                        }
                    }
                ]
            })).data;
            const data = [];
            const empty_vouchers = vouchers.filter(voucher => !voucher.reader_id);
            for (let reader of readers) {
                let voucher = vouchers.find(voucher => voucher.reader_id === reader._id);
                if (!voucher) {
                    voucher = empty_vouchers.pop();
                    if (!voucher) throw "Not enough vouchers";
                    data.push({
                        _id: voucher._id,
                        reader_id: reader._id
                    });
                }
            }
            const result = await req.apihelper.bulk_put("voucher", "_id", data);
            results.push({ vouchertype, result });
        }
        res.send({ vouchertypes, segments, valid_from, valid_to, results });
    } catch(err) {
        console.error(err);
        res.status(500).send(err);
    }
})

router.get("/pnp", async (req, res) => {
    res.render("voucher/pnp", { title: "PnP Vouchers" });
});

router.post("/pnp", fileUpload(), async (req, res) => {
    // console.log(req.files)
    const file = req.files.codes;
    const codes = file.data.toString().split("\n").map(code => code.trim());
    // console.log(codes.length, codes[0])
    // const codes = req.body.codes.split("\n").map(code => code.trim());
    // Make sure we only have valid codes - they should start with DM
    const valid_codes = codes.filter(code => code.startsWith("DM"));
    //Split into two arrays
    const alength = Math.floor(valid_codes.length / 2);
    const array_1 = valid_codes.slice(0, alength);
    const array_2 = valid_codes.slice(alength, valid_codes.length);
    const result = ["code"];
    //Merge the codes using | as a join
    for (let i = 0; i < alength; i++) {
        result.push(array_1[i] + "|" + array_2[i]);
    }
    const formatted_codes = result.join("\n");
    // console.log(`Code count: ${result.length}, valid codes: ${valid_codes.length}, original codes: ${codes.length}`);
    res.attachment("pnp_codes.csv");
    res.send(formatted_codes);

    // res.download(Buffer.from(formatted_codes), "pnp_codes.txt");
    // res.render("voucher/pnp_results", { title: "PnP Vouchers", formatted_codes });
})

export default router;