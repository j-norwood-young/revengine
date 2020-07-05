/* global JXPSchema ObjectId Mixed */

const Woocommerce_OrderSchema = new JXPSchema({
    id: Number, 
    customer_id: Number, 
    customer_ip_address: String, 
    customer_user_agent: String, 
    date_completed: Date, 
    date_created: Date, 
    date_modified: Date, 
    date_paid: Date, 
    order_key: String, 
    payment_method: String, 
    product_name: String, 
    total: Number,
    products: [ Mixed ]
},
    {
        perms: {
            admin: "crud", // CRUD = Create, Retrieve, Update and Delete
            owner: "crud",
            user: "r",
            all: "" // Unauthenticated users will be able to read from Woocommerce_Order, but that is all
        }
    });

const Woocommerce_Order = JXPSchema.model('Woocommerce_Order', Woocommerce_OrderSchema);
module.exports = Woocommerce_Order;