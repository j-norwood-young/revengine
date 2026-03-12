/* global JXPSchema */

const ProductSchema = new JXPSchema({
    name: { type: String },
    quantity: { type: Number },
    total: { type: Number }
});

const CustomerValueSchema = new JXPSchema({
    uid: { type: String, unique: true },
    date_paid: { type: Date },
    first_payment: { type: Date },
    last_payment: { type: Date },
    lifetime_value: { type: Number },
    month: { type: String, index: true },
    wordpress_id: { type: Number, index: true },
    month_value: { type: Number },
    payment_method: { type: String, index: true },
    products: { type: [ProductSchema] },
    product_name: { type: String, index: true },
    recurring_period: { type: String, index: true }
},
    {
        perms: {
            admin: "crud",
            owner: "crud",
            user: "r"
        }
    });

const CustomerValue = JXPSchema.model('customer_value', CustomerValueSchema);
module.exports = CustomerValue;