const d3 = require("d3");
const axios = require("axios");
class ActivitiesD3 {
    constructor(reader_id) {
        document.addEventListener("DOMContentLoaded", async (event) => {
            try {
                const result = await axios.get(`/reader/activities/${reader_id}`);
                const json_data = result.data;
                const width = 960,
                    height = 136,
                    cellSize = 17; // cell size

                const format = d3.timeFormat("%Y-%m-%d");
                const max = d3.max(d3.values(data, d => data.get(d)))
                let min_date, max_date = null;
                for (d of json_data) {
                    let year = new Date(d.date).getFullYear();
                    if (!min_date) min_date = year;
                    if (year > max_date) max_date = year;
                    if (year < min_date) min_date = year;
                }
                const svg = d3.select("#activitiesD3").selectAll("svg.activities-d3")
                    .data(d3.range(min_date, max_date + 1))
                    .enter().append("svg")
                    .attr("width", width)
                    .attr("height", height)
                    .attr("class", "RdYlGn")
                    .append("g")
                    .attr("transform", "translate(" + ((width - cellSize * 53) / 2) + "," + (height - cellSize * 7 - 1) + ")");

                const monthPath = t0 => {
                    var t1 = new Date(t0.getFullYear(), t0.getMonth() + 1, 0),
                        d0 = t0.getDay(), w0 = d3.timeWeek.count(d3.timeYear(t0), t0)
                    d1 = t1.getDay(), w1 = d3.timeWeek.count(d3.timeYear(t1), t1);
                    return "M" + (w0 + 1) * cellSize + "," + d0 * cellSize
                        + "H" + w0 * cellSize + "V" + 7 * cellSize
                        + "H" + w1 * cellSize + "V" + (d1 + 1) * cellSize
                        + "H" + (w1 + 1) * cellSize + "V" + 0
                        + "H" + (w0 + 1) * cellSize + "Z";
                }

                svg.append("text")
                    .attr("transform", "translate(-6," + cellSize * 3.5 + ")rotate(-90)")
                    .style("text-anchor", "middle")
                    .text(function (d) { return d; });

                var rect = svg.selectAll(".day")
                    .data(function (d) { return d3.timeDays(new Date(d, 0, 1), new Date(d + 1, 0, 1)); })
                    .enter().append("rect")
                    .attr("class", "day")
                    .attr("width", cellSize)
                    .attr("height", cellSize)
                    .attr("x", function (d) { return d3.timeWeek.count(d3.timeYear(d), d) * cellSize; })
                    .attr("y", function (d) { return d.getDay() * cellSize; })
                    .datum(format);

                rect.append("title")
                    .text(function (d) { return d; });

                svg.selectAll(".month")
                    .data(function (d) { return d3.timeMonths(new Date(d, 0, 1), new Date(d + 1, 0, 1)); })
                    .enter().append("path")
                    .attr("class", "month")
                    .attr("d", monthPath);

                var data = d3.nest()
                    .key(function (d) { return format(new Date(d.date)) })
                    .rollup(function (d) { return d.length })
                    .map(json_data);

                const color = d3.scaleOrdinal()
                    .domain([1, max])
                    .range(["#8BF656", "#70CE44", "#56A832", "#3F8223", "#2B5F15", "#183E09"]);
                // console.log('data', data);

                rect.filter(function (d) { return data.has(d); })
                    .style("fill", d => color(data.get(d)))
                    .select("title")
                    .text(d => d + ": " + data.get(d));
            } catch (err) {
                console.error(err);
            }
        });
    }
    
}

module.exports = ActivitiesD3;