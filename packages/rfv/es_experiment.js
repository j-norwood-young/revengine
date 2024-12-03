import esclient from "@revengine/common/esclient.js";
import { aggregate, close as mongoClose } from "@revengine/common/mongo.js";

const index_name = "rfv_experiment";
const BATCH_SIZE = 10000;

async function ensure_index() {
    const result = await esclient.ensure_index(index_name, {
        uid: { type: "keyword" },
        period: { type: "keyword" },
        day: { type: "date" },
        reader_id: { type: "keyword" },
        wordpress_id: { type: "integer" },
        insider: { type: "boolean" },
        email: { type: "keyword" },
        monthly_value: { type: "integer" },
        lifetime_value: { type: "integer" },
        first_payment: { type: "date" },
        last_payment: { type: "date" },
        date_paid: { type: "date" },
        // count: { type: "integer" }, // This will be a calculated field
        web_count: { type: "integer" },
        books_count: { type: "integer" },
        app_count: { type: "integer" },
        sailthru_transactional_open_count: { type: "integer" },
        sailthru_transactional_click_count: { type: "integer" },
        sailthru_blast_open_count: { type: "integer" },
        sailthru_blast_click_count: { type: "integer" },
        touchbasepro_open_count: { type: "integer" },
        touchbasepro_click_count: { type: "integer" },
        quicket_count: { type: "integer" },
    });
    if (result) {
        console.log("Index created");
    }
}

async function fetchMongoRecords(startDate, endDate, page, pageSize) {
    const skip = page * pageSize;
    return await aggregate("interactions", [
        {
            $match: {
                day: { $gte: new Date(startDate), $lte: new Date(endDate) }
            }
        },
        { $skip: skip },
        { $limit: pageSize }
    ]);
}

async function insertIntoElasticsearch(records) {
    const body = records.flatMap(doc => {
        // Create a new object without the _id field
        const { _id, ...docWithoutId } = doc;
        return [
            { index: { _index: index_name, _id: doc.uid } },
            docWithoutId
        ];
    });

    const bulkResponse = await esclient.bulk({ refresh: true, body });

    if (bulkResponse.errors) {
        const erroredDocuments = [];
        bulkResponse.items.forEach((action, i) => {
            const operation = Object.keys(action)[0];
            if (action[operation].error) {
                erroredDocuments.push({
                    status: action[operation].status,
                    error: action[operation].error,
                    operation
                });
            }
        });
        console.error('Failed documents:', erroredDocuments);
    }

    return bulkResponse.items.length;
}

async function main(startDate, endDate, limit) {
    await ensure_index();

    let page = 0;
    let totalProcessed = 0;
    let hasMore = true;

    while (hasMore && totalProcessed < limit) {
        const records = await fetchMongoRecords(startDate, endDate, page, BATCH_SIZE);

        if (records.length === 0) {
            hasMore = false;
            break;
        }

        const existingDocs = await esclient.search({
            index: index_name,
            body: {
                query: {
                    terms: {
                        uid: records.map(r => r.uid)
                    }
                }
            },
            _source: false
        });
        let existingUids = new Set();
        if (existingDocs?.length > 0) {
            existingUids = new Set(existingDocs.body.hits.hits.map(hit => hit._id));
        }
        const newRecords = records.filter(record => !existingUids.has(record.uid));

        if (newRecords.length > 0) {
            const inserted = await insertIntoElasticsearch(newRecords);
            totalProcessed += inserted;
            console.log(`Inserted ${inserted} records. Total processed: ${totalProcessed}`);
        }

        page++;
    }

    console.log(`Finished processing. Total records inserted: ${totalProcessed}`);
    await esclient.close();
    await mongoClose();
}

// Example usage:
main("2024-01-01", "2024-01-31", 2000000);
