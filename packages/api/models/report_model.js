/* global JXPSchema ObjectId Mixed */

const ReportChartItemSchema = new JXPSchema({
    chart_id: { type: ObjectId, link: "Saved_Chart" },
    col: Number,
    row: Number,
    colspan: Number,
    rowspan: Number,
});

const ReportScheduleSchema = new JXPSchema({
    frequency: String,
    dayOfWeek: Number,
    dayOfMonth: Number,
    time: String,
    recipients: [String],
    format: String,
});

const ReportSchema = new JXPSchema({
    name: { type: String, required: true },
    description: String,
    type: { type: String, index: true },
    charts: [ReportChartItemSchema],
    is_public: { type: Boolean, default: false },
    schedule: ReportScheduleSchema,
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

ReportSchema.pre("save", function (next) {
    this.updated_at = new Date();
    if (!this.created_at) {
        this.created_at = this.updated_at;
    }
    next();
});

const Report = JXPSchema.model("Report", ReportSchema);
module.exports = Report;

