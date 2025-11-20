/* global $ locations */
"use strict";

import Collections from "../../libs/collections.js";
import { formatNumber } from "../../libs/utils.js";
import $ from "jquery";

class List {
    constructor(el) {
        this.tblEl = $(el);
        this.type = listTable.dataset.type;
        console.log("Loading", this.type)
        this.collections = new Collections();
        this.datadef = this.collections.datadefs[this.type];
        this.page = 1;
        this.isLoading = false;
        this.filters = {};
        this.count = 0;
        this.page_count = 0;
        this.search = "";
        this.sortby = this.datadef.sortby || "name";
        this.sortdir = this.datadef.sortdir || 1;
        this.populate = this.datadef.populate || null;
        this.has_actions = this.datadef.actions && this.datadef.actions.length;
        // Pug templates are loaded by webpack pug-loader
        this.templateColHead = require("../../views/list/template-col-head-th.pug");
        this.filterTemplate = require("../../views/list/listfilters.pug");
        this.clear();
        this.loadFilters();
        this.loadSearch();
        this.loadData();
        this.infiniteScroller();
        this.loadSort();
        // this.listenGroupAction();
    }

    header() {
        const self = this;
        if (this.has_actions) {
            this.tblHeadTr.append(`<th><input type="checkbox" id="selectAll" class="chk-check-all enable-on-check ays-ignore" data-check_target=".chk-line" data-enable_on_check_target=".group-actions"></th>`)
        }
        this.datadef.fields.filter(field => field.list_view).forEach(col => {
            $(self.tblHeadTr).append(self.templateColHead({ col, sortby: this.sortby, sortdir: this.sortdir }))
        });
    }

    loadingSpinners() {
        if (this.isLoading) {
            $("#countContainer").css("opacity", 0);
            this.tblEl.parent().find(".loading-spinner").remove();
            this.tblEl.after(`<div id="listLoading" class="spinner-border loading-spinner" role="status"><span class="sr-only">Loading...</span></div>`);
        } else {
            $("#countContainer").css("opacity", 100);
            this.tblEl.parent().find(".loading-spinner").remove();
        }
    }

    async loadData() {
        try {
            if (this.isLoading) return;
            this.isLoading = true;
            this.loadingSpinners()
            let search = this.search;
            let search_fields = this.datadef.search_fields || [];
            const result = await $.post(`/list/paginate/${this.type}`, {
                page: this.page,
                sortby: this.sortby,
                sortdir: this.sortdir,
                filters: JSON.stringify(this.filters),
                search,
                search_fields,
                populate: JSON.stringify(this.populate)
            });
            this.count = result.count;
            $("#count").html(formatNumber(this.count));
            this.page_count = result.page_count;
            for (let row of result.data) {
                let s = "";
                if (this.has_actions) {
                    s += `<td><input type="checkbox" data-_id="${row._id}" class="chk-line enable-on-check" data-enable_on_check_target=".group-actions" /></td>`
                }
                for (let col of this.datadef.fields.filter(field => field.list_view)) {
                    if (col.link) {
                        s += `<td><a href="/item/edit/${this.type}/${row._id}">${await Promise.resolve(col.d(row))}</a></td>`;
                    } else {
                        s += `<td>${await Promise.resolve(col.d(row))}</td>`;
                    }
                }
                s = `<tr id="row-${row._id}" data-_id="${row._id}">${s}</tr>\n`;
                this.tblBody.append(s);
            }
            this.isLoading = false;
            this.loadingSpinners()
        } catch (err) {
            console.error(err);
            alert("Something has gone terribly wrong...");
            this.isLoading = false;
            this.loadingSpinners()
        }
    }

    clear() {
        this.page = 1;
        this.tblEl.empty();
        this.tblEl.append("<thead></thead>");
        this.tblEl.append("<tbody></tbody>");
        this.tblHead = this.tblEl.find("thead");
        this.tblBody = this.tblEl.find("tbody");
        this.tblHead.append("<tr></tr>");
        this.tblHeadTr = this.tblHead.find("tr");
        this.header();
    }

    infiniteScroller() {
        const self = this;
        $(window).on("scroll", async () => {
            if (self.page > self.page_count) return;
            if (Math.ceil($(window).scrollTop() + $(window).height()) >= $(document).height()) {
                self.page++;
                await self.loadData();
            }
        });
    }

    loadFilters() {
        const self = this;
        if (!this.datadef.filters) return;
        $(document).on("change", ".list-filter", e => {
            let el = $(e.currentTarget);
            const field = el.data("field");
            if (el.val()[0] === "*") {
                delete(self.filters[field]);
                self.clear();
                self.loadData();
                return;
            }
            if (!self.filters[field]) self.filters[field] = {
                "$all": []
            };
            self.filters[field]["$all"] = el.val();
            if (self.filters[field] === "*" || (Array.isArray(self.filters[field]) && self.filters[field].includes("*"))) {
                delete (self.filters[field]);
            }
            self.clear();
            self.loadData();
        })
        $(document).on("change", ".list-checkbox-filter", e => {
            let el = $(e.currentTarget);
            const field = el.data("field")
            if (!self.filters[field]) self.filters[field] = {};
            if (!self.filters[field]["$all"]) self.filters[field]["$all"] = [];
            if (el.is(":checked")) {
                self.filters[field]["$all"].push(el.val());
            } else {
                self.filters[field]["$all"].splice(self.filters[field].indexOf(el.val()), 1);
            }
            self.clear();
            self.loadData();
        })
        const filtersEl = $("#listFilters");
        this.datadef.filters.forEach(async filter => {
            let options = await filter.options();
            filtersEl.append(self.filterTemplate({ filter, options }));
        })
    }

    loadSearch() {
        const self = this;
        $("#btn_search").on("click", e => {
            e.preventDefault();
            self.doSearch();
        });
        $("#search_string").on("keypress", e => {
            if (e.keyCode === 13) {
                self.doSearch();
            }
        })
    }

    doSearch() {
        const self = this;
        self.search = $("#search_string").val();
        self.clear();
        self.loadData();
    }

    loadSort() {
        const self = this;
        $(document).on("click", "th.order-by", e => {
            let el = $(e.currentTarget);
            if (!el.data("field")) return;
            if (el.data("field") === self.sortby) { // Just switch direction
                if (self.sortdir === -1) {
                    self.sortdir = 1;
                } else {
                    self.sortdir = -1;
                }
            } else {
                self.sortby = el.data("field");
                self.sortdir = 1;
            }
            self.clear();
            self.loadData();
        })
    }

    listenGroupAction() {
        const deleteMany = async (ids) => {
            $(".spinner-action").removeClass("hide");
            for (let _id of ids) {
                try {
                    await $.delete(`${apiserver}/${this.type}/${_id}?apikey=${apikey}`);
                    $(`tr#row-${_id}`).slideUp();
                } catch (err) {
                    console.error(err);
                }
            }
            await this.loadData();
            $(".spinner-action").addClass("hide");
        }
        if (this.has_actions) {
            $("#listActions").removeClass("hide");
        }
        $("#group_actions").on("change", e => {
            e.preventDefault();
            let action = $(e.currentTarget).val();
            let options = $(".chk-line:checked:visible");
            $("#group_actions").val($("#group_actions option:first").val());
            $("#group_actions").trigger("chosen:updated");
            let ids = [];
            options.each((index, option) => {
                ids.push($(option).data("_id"));
            });
            switch (action) {
                case "delete":
                    deleteMany(ids);
                    break;

                default:
                    break;
            };

        })
    }
}

export default List;
