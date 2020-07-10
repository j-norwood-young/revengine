require("bootstrap/dist/js/bootstrap.bundle.js")
require("./libs/confirm_passwords");
const CheckboxFixPost = require("checkbox-fix-post");
const List = require("./list");
global.Edit = require("./edit");
const checkboxfixpost = new CheckboxFixPost();

window.ActivitiesD3 = require("./libs/activities_d3");
window.Beam = require("../../libs/beam");
window.Charts = require("../../libs/charts");

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