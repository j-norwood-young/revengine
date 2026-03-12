import JXPHelper from "jxp-helper";
import config from "config";
import dotenv from "dotenv";
dotenv.config();
const apihelper = new JXPHelper({ server: process.env.API_SERVER || config.api.server, apikey: process.env.APIKEY });

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

export { prediction_dump };