import stylesheet from "../stylesheets/style.scss";
import "bootstrap/dist/js/bootstrap.bundle.js";
import "./libs/confirm_passwords.js";
import "./libs/email_typeahead.js";

import CheckboxFixPost from "checkbox-fix-post";
import List from "./list.js";
import Edit from "./edit.js";
global.Edit = Edit;
const checkboxfixpost = new CheckboxFixPost();

import ActivitiesD3 from "./libs/activities_d3.js";
window.ActivitiesD3 = ActivitiesD3;
import Beam from "../../libs/beam.js";
window.Beam = Beam;
import Charts from "../../libs/charts.js";
window.Charts = Charts;
import $ from "jquery";
window.$ = $;

import CodeMirror from "codemirror";
import "codemirror/mode/javascript/javascript.js";

// const Reader = require("./typedefs/reader");
document.addEventListener("DOMContentLoaded", async e => {
    const listTable = document.querySelector("#listTable");
    if (listTable) {
        const list = new List(listTable);
    }
    const code_els = document.getElementsByClassName("code");
    for (let code_el of code_els) {
        CodeMirror.fromTextArea(code_el, {
            lineNumbers: true,
            mode: "javascript",
            indentUnit: 3,
            smartIndent: true,
        });
    }
});

$(function() {
    $(".confirm").on("click", e => {
        if (confirm("Are you sure?")) {
            return true;
        } else {
            e.preventDefault();
            return false;
        }
    })
})

// require([
//     "../../node_modules/codemirror/lib/codemirror", "../../node_modules/codemirror/mode/javascript/javascript"
// ], function (CodeMirror) {
//     CodeMirror.fromTextArea(document.getElementsByClassName("code"), {
//         lineNumbers: true,
//         mode: "javascript"
//     });
// });

import Search from "./libs/search.js";
const search = new Search();

import Progressbar from "./libs/progress_bar.js";
const progressbar = new Progressbar();

import ReaderView from "./reader/reader_view.js";
const reader_view = new ReaderView();