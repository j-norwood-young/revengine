/* global JXPSchema */

const VoucherSchema = new JXPSchema({
    vouchertype_id: { type: ObjectId, link: "vouchertype", index: true },
    reader_id: { type: ObjectId, link: "reader", index: true },
    valid_from: { type: Date, index: true },
    valid_to: { type: Date, index: true },
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

VoucherSchema.index({ vouchertype_id: 1, reader_id: 1, valid_from: 1, valid_to: 1 });

const Voucher = JXPSchema.model('voucher', VoucherSchema);
module.exports = Voucher;