const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
const Mixed = mongoose.Schema.Types.Mixed;
const shared = require("../libs/shared");

const WoocommerceSubscriptionSchema = new Schema({
    email: String,
    first_name: String,
    last_name: String,
    company: String,
    status: String,
    id: Number,
    parent_id: Number,
    order_key: String,
    date_created: Date,
    date_modified: Date,
    total: Number,
    payment_method: String,
    created_via: String,
    date_paid: Date,
    date_completed: Date,
    billing_period: String,
    billing_interval: Number,
    start_date: Date,
    next_payment_date: Date,
    end_date: Date,
    date_completed_gmt: Date,
    date_paid_gmt: Date,
    product: String,
    line_items: Mixed,
    billing: Mixed,
    shipping: Mixed
});

// We can set permissions for different user types and user groups
WoocommerceSubscriptionSchema.set("_perms", {
    admin: "crud",
});

WoocommerceSubscriptionSchema.post("save", function(doc) {
    shared.datasource_post_save("woocommercesubscription", doc);
});

module.exports = mongoose.model('WoocommerceSubscription', WoocommerceSubscriptionSchema);