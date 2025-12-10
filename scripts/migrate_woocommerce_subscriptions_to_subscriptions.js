const parseAmount = raw => {
    const cleaned = `${raw ?? ''}`.replace(/[^\d.-]/g, '');
    return Number.isNaN(Number(cleaned)) ? 0 : Number.parseFloat(cleaned);
};

const normalizeProduct = item => {
    const productQuantity = Number(item.quantity) || 0;
    const productTotal = parseAmount(item.total ?? item.line_total ?? item.subtotal);
    const productPrice = productQuantity > 0
        ? Math.round(productTotal / productQuantity)
        : Math.round(productTotal);
    return {
        external_id: item.product_id ? Number(item.product_id) : (item.id ? Number(item.id) : null),
        product_name: item.name,
        product_description: item.description || item.name,
        product_quantity: productQuantity,
        product_price: productPrice
    };
};

const buildSubscription = subscription => {
    const products = Array.isArray(subscription.products) ? subscription.products.map(normalizeProduct) : [];
    const reader = db.readers.findOne({ wordpress_id: subscription.customer_id });
    const totalFromProducts = products.reduce((sum, p) => sum + (p.product_price * p.product_quantity), 0);
    return {
        provider: 'woocommerce',
        external_id: Number(subscription.id),
        reader_id: reader ? reader._id : null,
        billing_interval: subscription.billing_interval ? Number(subscription.billing_interval) : 1,
        billing_period: subscription.billing_period,
        payment_method: subscription.payment_method,
        products,
        schedule_next_payment: subscription.schedule_next_payment,
        schedule_start: subscription.schedule_start,
        schedule_end: subscription.schedule_end,
        cancellation_request_date: subscription.cancellation_request_date,
        cancellation_reason: subscription.cancellation_reason,
        status: subscription.status || 'pending',
        total: Number(subscription.total) || totalFromProducts
    };
};

const batchSize = 400;
let ops = [];

db.woocommerce_subscriptions.find().forEach(subscription => {
    const replacement = buildSubscription(subscription);
    ops.push({
        replaceOne: {
            filter: { provider: 'woocommerce', external_id: replacement.external_id },
            replacement,
            upsert: true
        }
    });
    if (ops.length >= batchSize) {
        db.subscriptions.bulkWrite(ops);
        ops = [];
    }
});

if (ops.length) {
    db.subscriptions.bulkWrite(ops);
}