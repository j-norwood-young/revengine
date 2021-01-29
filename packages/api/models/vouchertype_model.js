/* global JXPSchema */

const VoucherTypeSchema = new JXPSchema({
    name: String,
    code: String,
},
{
    perms: {
        admin: "crud",
        owner: "crud",
        user: "cr",
        all: ""
    }
});

const VoucherType = JXPSchema.model('vouchertype', VoucherTypeSchema);
module.exports = VoucherType;