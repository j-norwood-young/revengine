import Typedef from "./typedef.js";

class Reader extends Typedef  {
    constructor(state) {
        super(state);
        this.type = "reader";
        this.fields = ["email", "first_name", "last_name", "membership_status", "email_state", "visit_count"];
        this.table_fields = {
            email: {
                display: "Email",
                sortable: true,
                searchable: true,
            },
            first_name: {
                display: "First Name",
                sortable: true,
                searchable: true
            },
            last_name: {
                display: "Last Name",
                sortable: true,
                searchable: true
            },
            membership_status: {
                display: "Membership Status",
                sortable: true,
                searchable: false
            },
            email_state: {
                display: "Email Status",
                sortable: true,
                searchable: false
            },
            visit_count: {
                display: "Visit Count",
                sortable: true,
                searchable: false
            },
        }
        this.default_state = {
            page: 1,
            per_page: 100,
            search: "",
            sort: {
                date_created: -1
            }
        }
    }
}

export default Reader;