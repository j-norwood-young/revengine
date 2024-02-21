import apihelper from "@revengine/common/apihelper"

export async function process_sailthru_blast_interactions(mday: moment.Moment){
    try {
        const query = [
            {
                $match: {
                    open_time: {
                        $gte: `new Date(\"${mday.clone().startOf("day").format("YYYY-MM-DDTHH:mm:ss")}\")`,
                        $lte: `new Date(\"${mday.clone().endOf("day").format("YYYY-MM-DDTHH:mm:ss")}\")`
                    },
                },
            },
            {
                $lookup: {
                    from: "sailthru_profile",
                    localField: "profile_id",
                    foreignField: "id",
                    as: "profile",
                },
            },
            {
                $unwind: "$profile",
            },
            {
                $group: {
                    _id: {
                        email: "$profile.email", 
                        day: {
                            $dateToString: {
                                date: "$open_time",
                                format: "%Y-%m-%d",
                            }
                        }
                    },
                    count: {
                        $sum: 1,
                    },
                    // open_time: {
                    //     $first: {
                    //         open_time: "$open_time",
                    //     }
                    // }
                },
            },
            {
                $lookup: {
                    from: "readers",
                    localField: "_id.email",
                    foreignField: "email",
                    as: "reader",
                }
            },
            {
                $unwind: "$reader",
            },
            {
                $project: {
                    _id: 0,
                    uid: {
                        $concat: ["$_id.email", "-", "$_id.day"]
                    },
                    day: {
                        $dateFromString: {
                            dateString: "$_id.day",
                            format: "%Y-%m-%d",
                        }
                    },
                    reader_id: "$reader._id",
                    email: "$_id.email",
                    sailthru_blast_open_count: "$count",
                },
            },
            // {
            //     $sort: {
            //         "sailthru_blast_open_count": -1,
            //     },
            // },
            {
                $merge: {
                    into: "interactions",
                    on: "uid",
                    whenMatched: "merge",
                    whenNotMatched: "insert",
                },
            }
        ];
        // console.log(JSON.stringify(query, null, 2));
        await apihelper.aggregate("sailthru_message_blast", query)
    } catch (error) {
        console.log(error);
    }
}