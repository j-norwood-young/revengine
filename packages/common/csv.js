const fetch = require("node-fetch");
const Papa = require("papaparse");

const fetch_csv = async (url) => {
    const csv = await fetch(url).then(res => res.text());
    const data = Papa.parse(csv, { worker: true, header: true }).data;
    return data;
}

module.exports = {
    fetch_csv
}