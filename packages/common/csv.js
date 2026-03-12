import Papa from "papaparse";

const fetch_csv = async (url) => {
    const csv = await fetch(url).then(res => res.text());
    const data = Papa.parse(csv, { worker: true, header: true }).data;
    return data;
}

export {
    fetch_csv
}