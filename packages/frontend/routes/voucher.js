const express = require('express');
const router = express.Router();
const moment = require("moment");

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

module.exports = router;