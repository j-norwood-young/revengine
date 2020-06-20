datasource_post_save = async function (type, doc) {
    const Reader = require("../models/reader_model");
    try {
        const reader = await Reader.findOne({ email: doc.email }).exec();
        if (!reader) return;
        let index = reader[type].indexOf(doc._id);
        if (index === -1) {
            reader[type].push(doc);
        } else {
            reader[type][index] = doc;
        }
        await reader.save();
    } catch (err) {
        console.error(err);
    }
}

module.exports = {
   datasource_post_save
}