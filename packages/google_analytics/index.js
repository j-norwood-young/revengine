const config = require("config");
const {BetaAnalyticsDataClient} = require('@google-analytics/data');
const analyticsDataClient = new BetaAnalyticsDataClient(config.google_analytics);
const moment = require("moment");
const apihelper = require("@revengine/common/apihelper");

async function runReport() {
    const start_date = moment().subtract(1, "week");
    const [response] = await analyticsDataClient.runReport({
        property: `properties/${config.google_analytics.propertyId}`,
        dateRanges: [
            {
                startDate: start_date.format("YYYY-MM-DD"),
                endDate: 'today',
            },
        ],
        dimensions: [
            {
                name: 'pagePath',
            },
            // {
            //     name: 'percentScrolled',
            // },
        ],
        metrics: [
            {
                name: "userEngagementDuration"
            },
            {
                name: "totalUsers"
            },
            {
                name: "engagementRate"
            },
            {
                name: "newUsers"
            },
        ],
    });
    // console.log('Report result:');
    // console.log(JSON.stringify(response.rows.slice(1, 10), null, 2));
    const result = response.rows
    .map(row => {
        const parts = row.dimensionValues[0].value.match(/\/(article|opinionista)\/(\d\d\d\d-\d\d-\d\d-)(.*)\//)
        const urlid = parts ? parts[3] : null
        return {
            urlid,
            avg_secs_engaged: Math.round(row.metricValues[0].value / row.metricValues[1].value),
            engagement_rate: Number(row.metricValues[2].value),
            // total_users: Number(row.metricValues[1].value),
            // new_users: Number(row.metricValues[3].value),
            returning_readers: Number(row.metricValues[1].value) - Number(row.metricValues[3].value)
        }
    })
    .filter(row => row.urlid)
    return result;
}

const main = async () => {
    const rows = await runReport();
    while (rows.length) {
        const result = await apihelper.bulk_put("article", "urlid", rows.splice(0, 1000));
        // console.log(result);
    }
}

main();