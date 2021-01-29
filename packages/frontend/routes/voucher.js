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

module.exports = router;