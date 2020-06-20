const getJson = url => {
    return new Promise((res, rej) => {
        var request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.onload = function () {
            if (this.status >= 200 && this.status < 400) {
                // Success!
                var data = JSON.parse(this.response);
                res(data)
            } else {
                // We reached our target server, but it returned an error
                console.error({ code: this.code, response: this.response });
                rej(`Error code ${this.status}`);
            }
        };

        request.onerror = function () {
            // There was a connection error of some sort
            rej("An unknown error occured");
        };

        request.send();
    });
}

class Typedef {
    constructor(state) {
        this.fields = this.fields || ["_id", "name"];
        this.table_fields = this.table_fields || {
            name: {
                display: "Name",
                sortable: true,
                searchable: true,
            },
        }
        this.default_state = this.default_state || {
            page: 1,
            per_page: 100,
            search: "",
            sort: {
                name: 1
            }
        }
        state = state || {};
        this.state = Object.assign(this.default_state, state);
    }

    async data() {
        const data = await getJson(`/list/json/${this.type}`);
        return data;
    }

    async table() {
        const result = await this.data();
        const template = require("../views/table.pug");
        return template({ table_fields: this.table_fields, data: result.data });
    }

}

module.exports = Typedef;