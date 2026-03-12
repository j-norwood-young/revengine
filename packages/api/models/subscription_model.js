/* global JXPSchema ObjectId Mixed */

const ProductSchema = new JXPSchema({
    external_id: { type: Number, index: true },
    product_name: { type: String, index: true },
    product_description: { type: String, index: true },
    product_quantity: { type: Number, index: true },
    product_price: { type: Number, index: true }
});

const SubscriptionSchema = new JXPSchema({
    provider: { type: String, index: true, enum: ['woocommerce', 'whitebeard'] },
    external_id: { type: Number, index: true },
    reader_id: { type: ObjectId, link: "reader", index: true },
    billing_interval: { type: Number, index: true },
    billing_period: { type: String, index: true },
    payment_method: { type: String, index: true },
    products: [ ProductSchema ],
    schedule_next_payment: { type: Date, index: true },
    schedule_start: { type: Date, index: true },
    schedule_end: { type: Date, index: true },
    cancellation_request_date: { type: Date, index: true },
    cancellation_reason: { type: String, index: true },
    status: { type: String, index: true },
    total: { type: Number, index: true },
},
{
    perms: {
        admin: "crud", // CRUD = Create, Retrieve, Update and Delete
        owner: "crud",
        user: "r",
        all: ""
    }
});

const Subscription = JXPSchema.model('Subscription', SubscriptionSchema);
module.exports = Subscription;