// Eg to run: 
// mongosh "mongodb://rfvengine1,rfvengine2,rfvengine3/revengine-prod?replicaSet=rs1&readPreference=secondaryPreferred" scripts/migrate_whitebeard_orders_to_orders.js

const parseAmount = raw => {
    const cleaned = `${raw ?? ''}`.replace(/[^\d.-]/g, '');
    return Number.isNaN(Number(cleaned)) ? 0 : Number.parseFloat(cleaned);
};

const normalizeCartItem = cartEntry => {
    const item = cartEntry.item ?? cartEntry;
    const quantity = Number(cartEntry.quantity ?? item?.quantity ?? 1) || 0;
    const priceSource = cartEntry.price ?? item?.price ?? item?.recurrentPrice ?? '0';
    const productPrice = Math.round(parseAmount(priceSource));
    const description = item?.description || item?.product_details?.description || '';
    const name = item?.product || item?.product_details?.name || description;
    const externalId = item?.productId
        ? Number(item.productId)
        : (item?.product_details?.id ? Number(item.product_details.id) : null);
    return {
        external_id: Number.isFinite(externalId) ? externalId : null,
        product_name: name,
        product_description: description || name,
        product_quantity: quantity || 1,
        product_price: productPrice
    };
};

const buildProducts = order => {
    if (Array.isArray(order.cart) && order.cart.length) {
        return order.cart.map(normalizeCartItem);
    }
    if (Array.isArray(order.items_details) && order.items_details.length) {
        return order.items_details.map(detail => normalizeCartItem({
            item: detail,
            quantity: Number(detail.quantity ?? 1),
            price: detail.price ?? detail.recurrentPrice
        }));
    }
    return [];
};

const buildWhitebeardOrder = order => {
    const products = buildProducts(order);
    const readerExternalId = Number(order.userId);
    const reader = Number.isFinite(readerExternalId)
        ? db.readers.findOne({ external_id: readerExternalId })
        : null;
    const status = order.status || order.shippingStatus || 'pending';
    const totalFromProducts = products.reduce((sum, product) => sum + product.product_price * product.product_quantity, 0);
    const parsedTotal = Math.round(parseAmount(order.price_matrix?.total ?? order.price ?? order.price_matrix?.subtotal ?? totalFromProducts));
    const externalId = Number(order.id);
    return {
        provider: 'whitebeard',
        external_id: Number.isFinite(externalId) ? externalId : null,
        reader_id: reader ? reader._id : null,
        date_completed: order.timestamp ?? order.lastUpdate,
        status,
        date_created: order.createdAt,
        date_modified: order.updatedAt ?? order.lastUpdate,
        date_paid: order.timestamp ?? order.lastUpdate,
        payment_method: order.paymentMethod,
        products,
        total: parsedTotal || totalFromProducts
    };
};

const BATCH_SIZE = 400;
let ops = [];

db.whitebeardorders.find().forEach(order => {
    const replacement = buildWhitebeardOrder(order);
    ops.push({
        replaceOne: {
            filter: { provider: 'whitebeard', external_id: replacement.external_id },
            replacement,
            upsert: true
        }
    });
    if (ops.length >= BATCH_SIZE) {
        db.orders.bulkWrite(ops);
        ops = [];
    }
});

if (ops.length) {
    db.orders.bulkWrite(ops);
}

