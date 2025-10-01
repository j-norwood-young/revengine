import config from "config";
import dotenv from "dotenv";
dotenv.config();
import elasticsearch from "@elastic/elasticsearch";

const es_config = Object.assign(config.elasticsearch, {
    auth: {
        username: process.env.ES_USER,
        password: process.env.ES_PASSWORD,
    }
});
const esclient = new elasticsearch.Client(es_config);

/**
 * Checks if an index exists in Elasticsearch and creates it if it doesn't exist.
 *
 * @param {string} index_name - The name of the index to check.
 * @param {Object} index_mapping - The mapping of the index to create if it doesn't exist.
 * @returns {Promise<boolean>} - Result of the operation, or "null" if the index already exists.
 */
esclient.ensure_index = async function (index_name, index_mapping) {
    const exists = await this.indices.exists({ index: index_name });
    if (!exists) {
        return await this.indices.create({
            index: index_name,
            body: {
                mappings: {
                    properties: index_mapping
                }
            }
        });
    }
    return null;
}

export default esclient;