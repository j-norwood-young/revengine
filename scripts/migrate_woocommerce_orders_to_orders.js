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
  
  const buildOrder = order => {
    const products = Array.isArray(order.products) ? order.products.map(normalizeProduct) : [];
    const reader = db.readers.findOne({ wordpress_id: order.customer_id });
    const status = order.status || order.order_status || (order.date_paid ? 'paid' : 'pending');
    const totalFromProducts = products.reduce((sum, p) => sum + (p.product_price * p.product_quantity), 0);
    return {
      provider: 'woocommerce',
      external_id: Number(order.id),
      reader_id: reader ? reader._id : null,
      date_completed: order.date_completed,
      status,
      date_created: order.date_created || order.createdAt,
      date_modified: order.date_modified || order.updatedAt,
      date_paid: order.date_paid,
      payment_method: order.payment_method,
      products,
      total: Number(order.total) || totalFromProducts
    };
  };
  
  const batchSize = 400;
  let ops = [];
  
  db.woocommerce_orders.find({ createdAt: { $gte: new Date("2025-07-01") }}).forEach(order => {
    const replacement = buildOrder(order);
    ops.push({
      replaceOne: {
        filter: { provider: 'woocommerce', external_id: replacement.external_id },
        replacement,
        upsert: true
      }
    });
    if (ops.length >= batchSize) {
      db.orders.bulkWrite(ops);
      console.log(`Migrated ${ops.length} orders`);
      ops = [];
    }
  });
  
  if (ops.length) {
    db.orders.bulkWrite(ops);
    console.log(`Migrated ${ops.length} orders`);
  }