import esclient from "@revengine/common/esclient";

const index_name = "rfv_experiment";

async function main() {
    const result = await esclient.ensure_index(index_name, {
        properties: {
            uid: { type: "keyword" },
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
            count: { type: "integer" },
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
        }
    });
    console.log(result);
}

main();