const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
const Mixed = mongoose.Schema.Types.Mixed;

const RempuserhitSchema = new Schema({
    email: { type: String, index: true },
    remp_30day_article_progress_avg: Mixed,
    remp_30day_article_timespent_avg: Mixed,
    remp_30day_article_timespent_tot: Number,
    remp_30day_article_hits_count: Number,
    remp_30day_top_campaign: [ String ],
    remp_30day_top_referer: [ String ],
    remp_30day_top_user_agent: [ String ],
    remp_30day_top_utm_medium: [ String ],
    remp_30day_top_utm_source: [ String ],
    remp_30day_top_device: [ String ],
    remp_30day_top_os: [ String ],
    remp_30day_top_os_version: [ String ],
    remp_30day_top_platform: [ String ],
    remp_30day_top_author: [ String ]
});

// We can set permissions for different user types and user groups
RempuserhitSchema.set("_perms", {
    admin: "crud", // CRUD = Create, Retrieve, Update and Delete
    owner: "crud",
    user: "r",
},
    {
        toObject: {
            virtuals: true
        },
        toJSON: {
            virtuals: true
        },
        timestamps: true,
        writeConcern: {
            w: 'majority',
            j: true,
            wtimeout: 1000
        },
    });

module.exports = mongoose.model('Rempuserhit', RempuserhitSchema);
