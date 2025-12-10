// Eg to run: 
// mongosh "mongodb://rfvengine1,rfvengine2,rfvengine3/revengine-prod?replicaSet=rs1&readPreference=secondaryPreferred" scripts/migrate_whitebeard_subscriptions_to_subscriptions.js

const parseAmount = raw => {
    const cleaned = `${raw ?? ''}`.replace(/[^\d.-]/g, '');
    return Number.isNaN(Number(cleaned)) ? 0 : Number.parseFloat(cleaned);
};

const normalizePurchasedItem = item => {
    if (!item) return null;
    const productPrice = Math.round(parseAmount(item.recurrentPrice ?? item.price ?? 0));
    const description = item.description || item.product_details?.description || '';
    const name = item.product || item.product_details?.name || description || 'whb-product';
    const externalId = item.product_details?.id ?? item.productId ?? item.id;
    return {
        external_id: Number.isFinite(Number(externalId)) ? Number(externalId) : null,
        product_name: name,
        product_description: description || name,
        product_quantity: 1,
        product_price: productPrice
    };
};

const orderCache = new Map();
const findWhitebeardOrder = referenceOrderId => {
    if (!referenceOrderId) return null;
    if (orderCache.has(referenceOrderId)) return orderCache.get(referenceOrderId);
    const found = db.whitebeardorders.findOne({ id: referenceOrderId });
    orderCache.set(referenceOrderId, found);
    return found;
};

const extractExternalUserIdFromOrder = order => {
    if (!order) return null;
    if (order.userId) {
        const parsed = Number(order.userId);
        if (Number.isFinite(parsed)) return parsed;
    }
    return null;
};

const buildProducts = subscription => {
    const purchasedItem = subscription.purchased_item;
    const normalized = normalizePurchasedItem(purchasedItem);
    return normalized ? [normalized] : [];
};

const buildWhitebeardSubscription = subscription => {
    const products = buildProducts(subscription);
    const referenceOrder = findWhitebeardOrder(subscription.referenceOrderId);
    const externalUserId = extractExternalUserIdFromOrder(referenceOrder);
    const reader = Number.isFinite(externalUserId)
        ? db.readers.findOne({ external_id: externalUserId })
        : null;

    const status = subscription.status === '1'
        ? 'active'
        : (subscription.status === '0' ? 'inactive' : subscription.status || 'unknown');
    const totalFromProducts = products.reduce((sum, product) => sum + (product.product_price * product.product_quantity), 0);
    const totalValue = Math.round(parseAmount(subscription.purchased_item?.recurrentPrice ?? subscription.purchased_item?.price ?? totalFromProducts));

    const period = subscription.purchased_item?.recurrentSchedule;
    const billingPeriod = period ? period.replace(/ly$/i, '') : null;

    const externalId = Number(subscription.id);

    return {
        provider: 'whitebeard',
        external_id: Number.isFinite(externalId) ? externalId : null,
        reader_id: reader ? reader._id : null,
        billing_interval: Number.isFinite(Number(subscription.purchased_item?.recurrentInterval ?? 1))
            ? Number(subscription.purchased_item?.recurrentInterval ?? 1)
            : 1,
        billing_period: billingPeriod,
        payment_method: subscription.paymentMethod,
        products,
        schedule_next_payment: subscription.nextRenewal,
        schedule_start: subscription.activationDate,
        schedule_end: subscription.deactivationDate,
        cancellation_request_date: subscription.cancellationRequestDate,
        cancellation_reason: subscription.cancellationReason,
        status,
        total: totalValue || totalFromProducts
    };
};

const BATCH_SIZE = 400;
let ops = [];

db.whitebeardsubscriptions.find().forEach(subscription => {
    const replacement = buildWhitebeardSubscription(subscription);
    ops.push({
        replaceOne: {
            filter: { provider: 'whitebeard', external_id: replacement.external_id },
            replacement,
            upsert: true
        }
    });
    if (ops.length >= BATCH_SIZE) {
        db.subscriptions.bulkWrite(ops);
        ops = [];
    }
});

if (ops.length) {
    db.subscriptions.bulkWrite(ops);
}

