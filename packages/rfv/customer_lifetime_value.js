import { aggregate, close as mongoClose, bulkWrite, ensureIndex } from "@revengine/common/mongo.js";
import moment from "moment";

async function calculateCustomerValues(date) {
    const startTime = Date.now();
    console.log('Starting customer value calculations...');

    // Ensure index exists
    await ensureIndex("customer_values", { uid: 1 }, { unique: true });
    await ensureIndex("customer_values", { customer_id: 1 });
    if (!date) {
        date = moment().subtract(1, 'month');
    }

    const pipeline = [
        {
            $match: {
                date_paid: {
                    $lte: date.clone().endOf("month").toDate(),
                    $ne: null
                },
                customer_id: {
                    $ne: null,
                    $gt: 0
                }
            }
        },
        {
            $group: {
                _id: "$customer_id",
                lifetime_value: { $sum: "$total" },
                dates_paid: { $push: "$date_paid" },
                total: { $first: "$total" },
                products: { $first: "$products" },
                payment_method: { $first: "$payment_method" }
            }
        },
        {
            $match: {
                dates_paid: {
                    $ne: null,
                    $lte: new Date(date.clone().endOf("month").toDate()),
                    $gte: new Date(date.clone().startOf("month").toDate())
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
                                $lte: date.clone().endOf("month").toDate(),
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
                month_value: "$total",
                // insider: { $literal: true },
                date_paid: {
                    $first: {
                        $filter: {
                            input: "$dates_paid",
                            as: "date_paid",
                            cond: {
                                $and: [
                                    { $lte: ["$$date_paid", date.clone().endOf("month").toDate()] },
                                    { $gte: ["$$date_paid", date.clone().startOf("month").toDate()] }
                                ]
                            }
                        }
                    }
                },
                first_payment: "$first_last_payments.first_payment",
                last_payment: "$first_last_payments.last_payment",
                products: "$products",
                payment_method: "$payment_method"
            }
        }
    ];

    const result = (await aggregate("woocommerce_orders", pipeline))
        .map(doc => ({
            uid: `${date.format("YYYY-MM")}-${doc.wordpress_id}`,
            month: date.format("YYYY-MM"),
            product_name: doc.products[0]?.name,
            // If the product name contains "Month", it's a monthly recurring product
            recurring_period: doc.products[0]?.name?.includes("Month") ? "monthly" : "yearly",
            ...doc
        }));
    console.log(`Aggregation completed in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    // Convert results to bulk operations
    if (result.length > 0) {
        const bulkOps = result.map(doc => ({
            updateOne: {
                filter: { uid: doc.uid },
                update: { $set: doc },
                upsert: true
            }
        }));

        const bulkResult = await bulkWrite("customer_values", bulkOps);
        console.log(`Processed ${result.length} customer value records. Updated: ${bulkResult.modifiedCount}, Inserted: ${bulkResult.upsertedCount}`);
    } else {
        console.log('No records to process');
    }

    console.log(`Total execution time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    return result;
}

async function main() {
    for (let i = 0; i <= 3; i++) {
        const date = moment().subtract(i, 'month');
        console.log(`Calculating customer values for ${date.format("MMM YYYY")}`);
        await calculateCustomerValues(date);
    }
    await mongoClose();
}

// Example usage:
main();
