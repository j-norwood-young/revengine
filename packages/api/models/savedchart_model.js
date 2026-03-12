/* global JXPSchema ObjectId Mixed */

const SavedChartSchema = new JXPSchema(
    {
        name: { type: String, required: true, index: true },
        description: String,
        chart_type: {
            type: String,
            enum: ["bar", "line", "pie", "top_metric", "location_map", "table"],
            required: true,
        },
        data_source: {
            type: String,
            enum: ["elasticsearch", "jxp"],
            required: true,
        },
        // Elasticsearch configuration
        es_metric: String,
        es_filters: Mixed,
        es_group_by: String,
        es_time_series_interval: {
            type: String,
            enum: ["hour", "day", "week"],
        },
        es_limit: Number,
        // JXP configuration
        jxp_resource: String,
        jxp_params: Mixed,
        jxp_aggregate: Mixed,
        // Presentation
        chart_options: Mixed,
        created_by: { type: ObjectId, link: "user" },
    },
    {
        perms: {
            admin: "crud",
            owner: "crud",
            user: "r",
            all: "",
        },
    },
);

const SavedChart = JXPSchema.model("savedchart", SavedChartSchema);
module.exports = SavedChart;

