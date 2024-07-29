import mongo from "@revengine/common/mongo"

export async function get_memberships(mday: moment.Moment) {
    try {
        console.log("get_memberships", mday.format("YYYY-MM-DD"));
        const interactions = await mongo.find("interactions", { day: mday.toDate() });
        // console.log(interactions.slice(0, 10));
        const reader_ids = interactions.map(i => i.reader_id);
        // console.log(reader_ids.slice(0, 10));
        console.time("get readers")
        const reader_pipeline = [
            {
                $match: {
                    _id: {
                        $in: reader_ids
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    wordpress_id: 1,
                    email: 1
                }
            }
        ];
        // console.log(JSON.stringify(reader_pipeline, null, 2));
        const readers = await mongo.aggregate("readers", reader_pipeline);
        console.timeEnd("get readers");
        console.log(`Readers: ${readers.length}`);
        console.time("get orders");
        const customer_ids = readers.map(r => r.wordpress_id);
        // Get previous month's orders
        const previous_month = mday.clone().subtract(1, "month");
        const orders_pipeline = [
            {
                $match: {
                    customer_id: { $in: customer_ids },
                    date_paid: {
                        $lte: previous_month.clone().endOf("month").toDate(),
                    }
                }
            },
            {
                $group: {
                    _id: "$customer_id",
                    lifetime_value: { $sum: "$total" },
                    dates_paid: { $push: "$date_paid" },
                    total: { $first: "$total" }
                }
            },
            {
                $match: {
                    dates_paid: {
                        $ne: null,
                        $lte: new Date(previous_month.clone().endOf("month").toDate()),
                        $gte: new Date(previous_month.clone().startOf("month").toDate())
                    },
                }
            },
            // First and last payments
            {
                $lookup: {
                    from: "woocommerce_orders",
                    let: { customer_id: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$customer_id", "$$customer_id"]
                                },
                                date_paid: {
                                    $ne: null,
                                    $exists: true,
                                    $lte: previous_month.clone().endOf("month").toDate(),
                                }
                            }
                        },
                        {
                            $sort: {
                                date_paid: 1
                            }
                        },
                        {
                            $group: {
                                _id: "$customer_id",
                                first_payment: { $first: "$date_paid" },
                                last_payment: { $last: "$date_paid" }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                wordpress_id: "$_id",
                                first_payment: 1,
                                last_payment: 1
                            }
                        }
                    ],
                    as: "first_last_payments"
                }
            },
            {
                $unwind: "$first_last_payments"
            },
            {
                $project: {
                    _id: 0,
                    wordpress_id: "$_id",
                    lifetime_value: 1,
                    monthly_value: "$total",
                    insider: { $literal: true },
                    date_paid: { 
                        $first: {
                            $filter: { 
                                input: "$dates_paid",
                                as: "date_paid",
                                cond: { 
                                    $and: [
                                        { $lte: ["$$date_paid", previous_month.clone().endOf("month").toDate()] },
                                        { $gte: ["$$date_paid", previous_month.clone().startOf("month").toDate()] }
                                    ]
                                } 
                            }
                        }
                    },
                    first_payment: "$first_last_payments.first_payment",
                    last_payment: "$first_last_payments.last_payment"
                }
            }
        ];
        // console.log(JSON.stringify(orders_pipeline, null, 2));
        const orders = await mongo.aggregate("woocommerce_orders", orders_pipeline);
        // console.log(orders.slice(0, 10));
        console.timeEnd("get orders");
        console.log(`Orders: ${orders.length}`);
        for (let order of orders) {
            const email = readers.find(r => r.wordpress_id === order.wordpress_id)?.email;
            if (!email) {
                console.log("No email for", order.wordpress_id);
                continue;
            }
            order.uid = `${email}-${mday.format("YYYY-MM-DD")}`;
            // delete order.wordpress_id;
        }
        // console.log(orders.slice(0, 10));
        return orders;
    } catch (err) {
        console.error(err);
    } finally {
        await mongo.close();
    }
}

export async function process_memberships(mday: moment.Moment) {
    const interactions = await get_memberships(mday);
    if (interactions.length === 0) {
        console.log("No interactions found for", mday.format("YYYY-MM-DD"));
        return;
    }
    const tmp_collection = `tmp_memberships_${mday.format("YYYYMMDD")}`;
    if (await mongo.collectionExists(tmp_collection)) {
        await mongo.dropCollection(tmp_collection);
    }
    await mongo.insertMany(tmp_collection, interactions);
    // Merge with existing interactions
    const merge_query = [
        {
            $project: {
                _id: 0,
                uid: 1,
                lifetime_value: 1,
                monthly_value: 1,
                date_paid: 1,
                insider: 1,
                wordpress_id: 1,
                first_payment: 1,
                last_payment: 1
            }
        },
        {
            $merge: {
                into: "interactions",
                on: "uid",
                whenMatched: "merge",
                whenNotMatched: "insert",
            }
        }
    ];
    await mongo.aggregate(tmp_collection, merge_query);
    await mongo.dropCollection(tmp_collection);
    await mongo.close();
}

export function first_last_payments() {
    try {
        const missing_dates_query = mongo.find("interactions", { date_paid: { $exists: true },  first_payment: { $exists: false }, last_payment: { $exists: false } }, { wordpress_id: true });
        const ids = missing_dates_query.map(i => i.wordpress_id);
        const unique_ids = new Set(ids);
        const pipeline = [
            {
                $match: {
                    customer_id: { $in: unique_ids },
                    date_paid: { $exists: true, $ne: null }
                }
            },
            {
                $group: {
                    _id: "$customer_id",
                    first_payment: { $min: "$date_paid" },
                    last_payment: { $max: "$date_paid" }
                }
            },
            {
                $project: {
                    _id: 0,
                    wordpress_id: "$_id",
                    first_payment: 1,
                    last_payment: 1
                }
            }
        ];
        const first_last_payments = mongo.aggregate("woocommerce_orders", pipeline);
    } catch (err) {
        console.error(err);
    }
}