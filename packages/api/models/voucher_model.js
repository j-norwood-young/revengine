/* global JXPSchema */

const VoucherSchema = new JXPSchema({
    vouchertype_id: { type: ObjectId, link: "vouchertype", index: true },
    reader_id: { type: ObjectId, link: "reader", index: true },
    valid_from: { type: Date, index: true },
    valid_until: { type: Date, index: true },
    code: { type: String, unique: true },
},
{
    perms: {
        admin: "crud",
        owner: "crud",
        user: "cr",
        all: ""
    }
});

const Voucher = JXPSchema.model('voucher', VoucherSchema);
module.exports = Voucher;