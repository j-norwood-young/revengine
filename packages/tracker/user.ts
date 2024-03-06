import config from "config";
import JXPHelper from "jxp-helper";
import * as dotenv from "dotenv";
dotenv.config();
const jxphelper = new JXPHelper({
    server: config.api.server,
    apikey: process.env.APIKEY,
});

export const get_user_data = async function (user_id): Promise<{ user_labels: string[], user_segments: string[] }> {
    if (!user_id) return { user_labels: [], user_segments: [] };
    let user_labels = [];
    let user_segments = [];
    const result = (
        await jxphelper.aggregate("reader", [
            {
                $match: {
                    wordpress_id: Number(user_id),
                },
            },
            {
                $lookup: {
                    from: "labels",
                    localField: "label_id",
                    foreignField: "_id",
                    as: "labels"
                }
            },
            {
                $lookup: {
                    from: "segmentations",
                    localField: "segmentation_id",
                    foreignField: "_id",
                    as: "segments"
                }
            },
            { 
                $project: { 
                    "labels.code": 1,
                    "segments.code": 1,
                } 
            },
        ])
    ).data.pop();
    if (result) {
        if (result.labels) {
            user_labels = result.labels.map(label => label.code);
        }
        if (result.segments) {
            user_segments = result.segments.map(segment => segment.code);
        }
    }
    return { user_labels, user_segments };
}

export const get_user_data_test = async function () {
    const user_id = 1;
    const expected = {
        user_labels: ['wordpress-users','no-email-interaction-30-days','paying-customer'],
        user_segments: [],
    };
    const actual = await get_user_data(user_id);
    console.log(actual);
    console.assert(JSON.stringify(actual) === JSON.stringify(expected));
}

// get_user_data_test();