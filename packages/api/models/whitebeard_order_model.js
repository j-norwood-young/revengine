/* global JXPSchema */

const WhitebeardOrderSchema = new JXPSchema({
    id: { type: String, index: true, unique: true },
    price: String,
    status: { type: String, index: true },
    responseMessage: Mixed,
    lastUpdate: { type: Date, index: true },
    timestamp: { type: Date, index: true },
    userId: { type: String, index: true },
    paymentMethod: { type: String, index: true },
    cart: [Mixed],
    price_matrix: {
        subtotal: Number,
        shipping: Number,
        tax: Number,
        discount: Number,
        total: Number
    },
    items_details: [Mixed],
    shippingStatus: { type: String, index: true },
    authorization: Mixed,
    address: String,
    shipping_address: Mixed,
    shipping_price: String,
    tax_price: String
},
    {
        perms: {
            admin: "crud",
            owner: "crud",
            user: "r",
            all: ""
        }
    });

WhitebeardOrderSchema.index({ status: 1 });
WhitebeardOrderSchema.index({ userId: 1 });
WhitebeardOrderSchema.index({ timestamp: 1 });
WhitebeardOrderSchema.index({ lastUpdate: 1 });
WhitebeardOrderSchema.index({ paymentMethod: 1 });
WhitebeardOrderSchema.index({ shippingStatus: 1 });

const WhitebeardOrder = JXPSchema.model('whitebeardorder', WhitebeardOrderSchema);
module.exports = WhitebeardOrder;

