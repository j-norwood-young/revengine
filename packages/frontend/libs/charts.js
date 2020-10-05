// Inspiration for how to draw chart.js server-side from https://github.com/shellyln/chart.js-node-ssr-example
const ChartJS = require("chart.js");
const { createCanvas } = require('canvas');
const Color = require("color");

class Charts {
    constructor(width, length) {
        this.width = width || 800;
        this.length = length || 400;
        this.node = (typeof process !== 'undefined' && process.versions && process.versions.node);
        if (this.node) {
            this.canvas = createCanvas(this.width, this.length);
            this.ctx = this.canvas.getContext('2d');
            this.ctx.canvas = {
                width: this.width,
                height: this.length,
                style: {
                    width: `${this.width}px`,
                    height: `${this.length}px`,
                },
            };
        }
    }

    nodify(ctx, opts) {
        let el = null;
        if (this.node) {
            opts.options.devicePixelRatio = 1;
            // Disable animations.
            opts.options.animation = false;
            opts.options.events = [];
            opts.options.responsive = false;
            el = { getContext: () => this.ctx };
        } else {
            el = ctx;
        }
        return [el, opts];
    }

    drawHistogram(opts) {
        if (!opts.element) throw ("element selector required");
        if (!opts.data) throw ("data required");
        opts = Object.assign({
            unit: "month",
            type: "line",
            key_label: "key_as_string",
            value_label: "doc_count",
            unit: "hour",
            label: "hits",
            colour: "rgba(66, 245, 182)",
        }, opts);
        const el = document.querySelector(opts.element);
        const mapped = item => {
            return {
                x: item[opts.key_label],
                y: (item[opts.value_label].value) ? item[opts.value_label].value : item[opts.value_label] ? item[opts.value_label] : 0
            }
        };
        const prepared_data = opts.data.map(mapped).filter(d => d.y);
        let chart_settings = {
            type: opts.type,
            data: {
                labels: prepared_data.map(d => d.x),
                datasets: [{
                    data: prepared_data.map(d => d.y),
                    label: opts.label,
                    backgroundColor: Color(opts.colour).alpha(0.5).rgb().string(),
                    borderColor: Color(opts.colour).alpha(0.8).rgb().string(),
                    highlightFill: Color(opts.colour).alpha(0.75).rgb().string(),
                    highlightStroke: Color(opts.colour).alpha(1).rgb().string(),
                }]
            },
            options: {
                scales: {
                    xAxes: [{
                        type: 'time',
                        time: {
                            unit: opts.unit
                        }
                    }],
                    yAxes: [{
                        ticks: {
                            beginAtZero: true,
                        }
                    }]
                }
            }
        };
        new ChartJS.Chart(...this.nodify(el.getContext("2d"), chart_settings));
    }

    drawTimeSpent(timespent_avg, ctx, unit) {
        unit = unit || "month";
        const mapped = item => {
            return {
                x: item.key_as_string,
                y: (item.timespent_avg.value) ? item.timespent_avg.value : 0
            }
        };
        const data = timespent_avg.buckets.map(mapped).filter(d => d.y);
        let opts = {
            type: 'line',
            data: {
                labels: data.map(d => d.x),
                datasets: [{
                    data: data.map(d => d.y),
                    label: "Avg Time Spent / Article",
                    backgroundColor: "rgba(66, 245, 182, 0.5)",
                    borderColor: "rgba(66, 245, 182, 0.8)",
                    highlightFill: "rgba(66, 245, 182, 0.75)",
                    highlightStroke: "rgba(66, 245, 182, 1)",
                }]
            },
            options: {
                scales: {
                    xAxes: [{
                        type: 'time',
                        time: {
                            unit
                        }
                    }]
                }
            }
        };
        new ChartJS.Chart(...this.nodify(ctx, opts));
    }

    drawArticleProgress(article_progress, ctx, unit) {
        unit = unit || "month";
        const mapped = item => {
            console.log({ item })
            return {
                x: item.key_as_string,
                y: (item.article_progress_avg.value) ? item.article_progress_avg.value : 0
            }
        };
        console.log({ article_progress});
        const data = article_progress.buckets.map(mapped).filter(d => d.y);
        let opts = {
            type: 'line',
            data: {
                labels: data.map(d => d.x),
                datasets: [{
                    data: data.map(d => d.y),
                    label: "Article Progress",
                    backgroundColor: "rgba(66, 135, 245, 0.5)",
                    borderColor: "rgba(66, 135, 245, 0.8)",
                    highlightFill: "rgba(66, 135, 245, 0.75)",
                    highlightStroke: "rgba(66, 135, 245, 1)",
                }]
            },
            options: {
                scales: {
                    xAxes: [{
                        type: 'time',
                        time: {
                            unit
                        }
                    }],
                    yAxes: [{
                        ticks: {
                            beginAtZero: true,
                            suggestedMax: 1
                        }
                    }]
                }
            }
        }
        new ChartJS.Chart(...this.nodify(ctx, opts));
    }

    toDataURL() {
        return this.canvas.toDataURL();
    }
}

module.exports = Charts;