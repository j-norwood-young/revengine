const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
const Mixed = mongoose.Schema.Types.Mixed;
const shared = require("../libs/shared");

const WoocommerceCustomerSchema = new Schema({
    id: Number,
    email: String,
    first_name: String,
    last_name: String,
    date_created: Date,
    date_modified: Date,
    role: String,
    username: String,
    is_paying_customer: Boolean,
    avatar_url: String,
    meta_data: Mixed,
    company: String,
    status: String,
    billing: Mixed,
    shipping: Mixed
});

// We can set permissions for different user types and user groups
WoocommerceCustomerSchema.set("_perms", {
    admin: "crud",
});

WoocommerceCustomerSchema.post("save", function (doc) {
    shared.datasource_post_save("woocommercecustomer", doc);
});

module.exports = mongoose.model('WoocommerceCustomer', WoocommerceCustomerSchema);