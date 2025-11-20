const periods = {
    hour: "now-1h/h",
    day: "now-1d/d",
    week: "now-7d/d",
    month: "now-30d/d",
    threemonth: "now-3M/M",
    sixmonth: "now-6M/M",
    year: "now-1y/y",
}

const period_filter = (query, period = "week") => {
    if (!periods[period]) throw `Unknown period. Choose from ${ Object.keys(periods).join(", ")}`;
    if (!query.body.query.bool) query.body.query.bool = {};
    if (!query.body.query.bool.filter) query.body.query.bool.filter = [];
    query.body.query.bool.filter.push({
        "range": {
            "time": {
                "lt": "now",
                "gte": periods[period],
            }
        }
    })
    return query;
}

export default period_filter;