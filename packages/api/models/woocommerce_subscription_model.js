/* global JXPSchema ObjectId Mixed */

const Woocommerce_SubscriptionSchema = new JXPSchema({
    id: Number,
    billing_interval: Number,
    billing_period: String,
    cancelled_email_sent: Boolean,
    created_via: String,
    customer_id: Number,
    customer_ip_address: String,
    customer_note: String,
    customer_user_agent: String,
    date_completed: Date,
    date_created: Date,
    date_modified: Date,
    date_paid: Date,
    payment_method: String,
    products: [ Mixed ],
    schedule_next_payment: Date,
    schedule_start: Date,
    status: String,
    suspension_count: Number,
    total: Number,
    meta_data: [ Mixed ],
    utm_source: String,
    utm_medium: String,
    utm_campaign: String,
    utm_term: String,
    referral: String,
    device_type: String,
    referral_url: String
},
{
    perms: {
        admin: "crud", // CRUD = Create, Retrieve, Update and Delete
        owner: "crud",
        user: "r",
        all: "" // Unauthenticated users will be able to read from Woocommerce_Subscription, but that is all
    }
});

const Woocommerce_Subscription = JXPSchema.model('Woocommerce_Subscription', Woocommerce_SubscriptionSchema);
module.exports = Woocommerce_Subscription;