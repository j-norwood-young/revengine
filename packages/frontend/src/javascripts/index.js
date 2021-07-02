require("bootstrap/dist/js/bootstrap.bundle.js")
require("./libs/confirm_passwords");
require("./libs/email_typeahead");

const CheckboxFixPost = require("checkbox-fix-post");
const List = require("./list");
global.Edit = require("./edit");
const checkboxfixpost = new CheckboxFixPost();

window.ActivitiesD3 = require("./libs/activities_d3");
window.Beam = require("../../libs/beam");
window.Charts = require("../../libs/charts");
window.$ = require("jquery");

const CodeMirror = require("codemirror");
const js = require("codemirror/mode/javascript/javascript");

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
            mode: "javascript"
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

const Search = require("./libs/search");
const search = new Search();

const Progressbar = require("./libs/progress_bar");
const progressbar = new Progressbar();

const ReaderView = require("./reader/reader_view");
const reader_view = new ReaderView();