const axios = require("axios");
const Charts = require("./charts");

class Beam {
    constructor() {
        this.node = (typeof process !== 'undefined' && process.versions && process.versions.node);
        this.charts = new Charts();
    }

    async get(url) {
        try {
            let result = await axios.get(url);
            return result.data;
        } catch (err) {
            return Promise.reject(err);
        }
    }

    async getReader(reader_id) {
        try {
            return this.get(`/reader/data/${reader_id}?interval=month`);
        } catch (err) {
            console.error(err);
        }
    }

    drawCharts(data) {
        this.charts.drawTimeSpent(data.timespent_avg, document.getElementById("beamTimespentAvg").getContext('2d'));
        this.charts.drawArticleProgress(data.article_progress.result, document.getElementById("beamArticleProgress").getContext("2d"));
    }

    
}

module.exports = Beam;