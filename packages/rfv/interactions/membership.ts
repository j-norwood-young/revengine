import mongo from "@revengine/common/mongo"
import config from "config";
import JXPHelper from "jxp-helper";
import dotenv from "dotenv";
dotenv.config({ path: "../../.env"});
const apihelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });

export async function get_memberships(mday: moment.Moment) {
    try {
        console.log("get_memberships", mday.format("YYYY-MM-DD"));
        const interactions = await mongo.find("interactions", { day: mday.format("YYYY-MM-DD") });
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
        console.log("Getting orders...")
        console.time("get orders");
        const customer_ids = readers.map(r => r.wordpress_id);
        const orders_pipeline = [
            {
                $match: {
                    customer_id: { $in: customer_ids },
                    date_paid: {
                        $lte: mday.clone().endOf("month").toDate(),
                    }
                }
            },
            // {
            //     $sort: {
            //         date_paid: -1
            //     }
            // },
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
                        $lte: new Date(mday.clone().endOf("month").toDate()),
                        $gte: new Date(mday.clone().startOf("month").toDate())
                    },
                }
            },
            {
                $project: {
                    _id: 0,
                    customer_id: "$_id",
                    lifetime_value: 1,
                    monthly_value: "$total",
                    insider: true,
                    date_paid: { 
                        $first: {
                            $filter: { 
                                input: "$dates_paid",
                                as: "date_paid",
                                cond: { 
                                    $and: [
                                        { $lte: ["$$date_paid", mday.clone().endOf("month").toDate()] },
                                        { $gte: ["$$date_paid", mday.clone().startOf("month").toDate()] }
                                    ]
                                } 
                            }
                        }
                    }
                }
            }
        ];
        // console.log(JSON.stringify(orders_pipeline, null, 2));
        const orders = await mongo.aggregate("woocommerce_orders", orders_pipeline);
        // console.log(orders.slice(0, 10));
        console.timeEnd("get orders");
        for (let order of orders) {
            const email = readers.find(r => r.wordpress_id === order.customer_id).email;
            order.uid = `${email}-${mday.format("YYYY-MM-DD")}`;
            delete order.customer_id;
        }
        console.log(orders.slice(0, 10));
        return orders;
    } catch (err) {
        console.error(err);
    } finally {
        await mongo.close();
    }
}

export async function process_memberships(mday: moment.Moment) {
    const interactions = await get_memberships(mday);
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
                insider: 1
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
    await mongo.close();
}