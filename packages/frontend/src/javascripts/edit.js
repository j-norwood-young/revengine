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
        try {
            this.data = await $.get(`${apiserver}/api/${this.type}/${this._id}?apikey=${apikey}`);
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
            console.log("Listening");
            $(document).on("change", ".cron-select", self.cronSelect.bind(self));
            $(document).on("keyup", ".text_array", self.textArray.bind(self));
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
        $(parent).find("input").val(cron_parts.join(" "))
    }

    textArray(e) {
        e.preventDefault();
        let el = e.currentTarget;
        const parent = $(el).parent(".form-group");
        // Check if there's an empty item at the bottom of the list
        const empty_inputs = parent.find("input").filter(function() { return !this.value });
        // If there isn't, add one
        if (empty_inputs.length === 0) {
            let newel = $(el).clone(true);
            newel.val("");
            newel.appendTo(parent);
        }
        // If there are too many, remove some
        if (empty_inputs.length > 1) {
            for (let x = 0; x < empty_inputs.length -1; x++) {
                empty_inputs[x].remove();
            }
        }
    }

}

module.exports = Edit;