const Collections = require("../../libs/collections");
const $ = require("jquery");

class Edit {
    constructor(_id, type) {
        this._id = _id;
        this.type = type;
        this.collections = new Collections();
        this.datadef = this.collections.datadefs[this.type];
        this.loadData();
        this.listeners();
    }

    async loadData() {
        console.log(`${apiserver}/${this.type}/${this._id}?apikey=${apikey}`);
        try {
            this.data = await $.get(`${apiserver}/${this.type}/${this._id}?apikey=${apikey}`);
            console.log(this.data);
            this.loadActions();
        } catch(err) {
            console.error(err);
        }
    }

    loadActions() {
        const self = this;
        $(".list-action").on("click", async e => {
            e.preventDefault();
            const action_id = $(e.currentTarget).data("id");
            const action = self.datadef.actions[action_id];
            console.log(self.datadef, { action });
            const result = await action.action(this.data);
            console.log(result);
        })
    }

    listeners() {
        const self = this;
        $(function() {
            $(document).on("change", ".cron-select", self.cronSelect.bind(self));
        });
    }

    cronSelect(e) {
        e.preventDefault();
        let el = e.currentTarget;
        let parent = $(el).parents(".cron-group");
        let cron_selects = $(parent).find(".cron-select");
        let cron_parts = [];
        $(cron_selects).each((i, cron_select) => {
            cron_parts.push($(cron_select).val());
        });
        console.log(cron_parts);
        $(parent).find("input").val(cron_parts.join(" "))
    }
}

module.exports = Edit;