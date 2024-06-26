/* global JXPSchema ObjectId Mixed */

const Woocommerce_MembershipSchema = new JXPSchema({
    id: { type: Number, index: true},
    "customer_id": { type: Number, index: true },
    "status": String,
    "start_date": Date,
    "end_date": Date,
    "cancelled_date": Date,
    "paused_date": Date,
    "paused_intervals": [ Mixed ],
    "date_created": Date,
    "date_modified": Date,
    "order": Mixed,
    "product": Mixed
},
    {
        perms: {
            admin: "crud", // CRUD = Create, Retrieve, Update and Delete
            owner: "crud",
            user: "r",
            all: ""
        }
    });

const Woocommerce_Membership = JXPSchema.model('Woocommerce_Membership', Woocommerce_MembershipSchema);
module.exports = Woocommerce_Membership;