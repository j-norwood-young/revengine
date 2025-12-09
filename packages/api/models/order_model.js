/* global JXPSchema ObjectId Mixed */

const ProductSchema = new JXPSchema({
    external_id: { type: Number, index: true },
    product_name: { type: String, index: true },
    product_description: { type: String, index: true },
    product_quantity: { type: Number, index: true },
    product_price: { type: Number, index: true }
});

const OrderSchema = new JXPSchema({
    provider: { type: String, index: true, enum: ['woocommerce', 'whitebeard'] },
    external_id: { type: Number, index: true }, 
    reader_id: { type: ObjectId, link: "reader", index: true },
    date_completed: { type: Date, index: true },
    status: { type: String, index: true },
    date_created: { type: Date, index: true, default: Date.now },
    date_modified: { type: Date, index: true, default: Date.now },
    date_paid: { type: Date, index: true },
    payment_method: { type: String, index: true }, 
    products: [ ProductSchema ],
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

// Calculate the total price of the order on write
OrderSchema.pre('save', function(next) {
    this.total = this.products.reduce((acc, product) => acc + product.product_price * product.product_quantity, 0);
    next();
});

// If state is "paid", set the date_paid to the current date
OrderSchema.pre('save', function(next) {
    if (this.status === 'paid') {
        this.date_paid = new Date();
    }
    next();
});

const Order = JXPSchema.model('Order', OrderSchema);
module.exports = Order;