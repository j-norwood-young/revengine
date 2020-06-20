const mongoose = require('mongoose');
var friendly = require("mongoose-friendly");
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
const Mixed = mongoose.Schema.Types.Mixed;

const DatasourceSchema = new Schema({
    urlid: String,
    name: String,
    model: String,
    url: String,
    params: Mixed,
    map: String,
    parallel_processes: { type: Number, default: 1 },
    username: String,
    pwd: String,
    run_schedule: String, // Cron-style schedule
    queue_schedule: String,
    key_field: String,
    prefetch_models: [ String ],
    queue: [ Mixed ],
    queue_generator: String,
    running: Boolean,
    queue_last_updated: Date,
    queue_last_popped: Date,
    last_result: Mixed,
    per_page: { type: Number, default: 1000 },
}, {
    timestamps: true
});

DatasourceSchema.set("_perms", {
    admin: "crud",
});

DatasourceSchema.plugin(friendly, {
    source: 'name',
    friendly: 'urlid'
});

const Datasource = mongoose.model('Datasource', DatasourceSchema);
module.exports = Datasource;
