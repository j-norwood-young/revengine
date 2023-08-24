// Favourite authors, sections and tags for readers
const config = require("config");
const JXPHelper = require("jxp-helper");
require("dotenv").config();
const jxphelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });
const moment = require("moment-timezone");
moment.tz.setDefault(config.timezone || "UTC");

const Favourites = async (email) => {
    const pipeline = [
        {
            $match: {
                source: "touchbaseevent-clicks",
                "article_id": {
                    $exists: true
                }
            },
        },
        // {
        //     $limit: 100
        // },
        {
            $lookup: {
                from: "articles",
                localField: "article_id",
                foreignField: "_id",
                as: "article"
            }
        },
        {
            $group: {
                _id: "$email",
                authors: { $push: "$article.author" },
                sections: { $push: "$article.sections" },
            }
        },
        {
            $addFields: {
                sections: {
                    $reduce: {
                        input: {
                            $reduce: {
                                input: "$sections",
                                initialValue: [],
                                in: { "$concatArrays": ["$$value", "$$this"] }
                            }
                        },
                        initialValue: [],
                        in: { "$concatArrays": ["$$value", "$$this"] }
                    }
                },
                authors: {
                    $reduce: {
                        input: "$authors",
                        initialValue: [],
                        in: { "$concatArrays": ["$$value", "$$this"] }
                    }
                },
            }
        },
    ]
    const results = (await jxphelper.aggregate("hit", pipeline)).data.map(item => {
        return {
            email: item._id,
            authors: [...new Set(item.authors)],
            sections: [...new Set(item.sections)],
        }
    });
    // if (!result.count) return false;
    // console.log(results)
    return results;
}

module.exports = Favourites;