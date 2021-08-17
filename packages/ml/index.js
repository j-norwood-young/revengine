const apihelper = require("@revengine/common/apihelper");

const prediction_dump = async (req, res) => {
    try {
        const data = req.body;
        if (!Array.isArray(data)) throw "Expected array";
        const firstrow = data[0];
        if (!firstrow.reader_id || !firstrow.date || !firstrow.score || !firstrow.prediction) throw "Missing column. Expected reader_id, date, score, prediction";
        await apihelper.bulk_post("mlprediction", data);
        res.send({ status: "okay", message: `Recieved ${data.length} records`});
    } catch(err) {
        console.error(err);
        res.send(500, { status: "error", error: err.message ? err.message : err.toString() })
    }
}

module.exports = {prediction_dump};