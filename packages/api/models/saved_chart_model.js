/* global JXPSchema ObjectId Mixed */

const Saved_ChartSchema = new JXPSchema({
    name: { type: String, required: true },
    description: String,
    chart_type: { type: String, index: true },
    data_source: { type: String, index: true },
    // Elasticsearch-backed configuration
    es_metric: String,
    es_filters: Mixed,
    es_group_by: String,
    es_time_series_interval: String,
    es_limit: Number,
    // JXP-backed configuration
    jxp_resource: String,
    jxp_params: Mixed,
    jxp_aggregate: [Mixed],
    // Presentation
    chart_options: Mixed,
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    created_by: String,
},
{
    perms: {
        admin: "crud",
        owner: "crud",
        user: "r",
        all: ""
    }
});

Saved_ChartSchema.pre("save", function (next) {
    this.updated_at = new Date();
    if (!this.created_at) {
        this.created_at = this.updated_at;
    }
    next();
});

const Saved_Chart = JXPSchema.model("Saved_Chart", Saved_ChartSchema);
module.exports = Saved_Chart;

