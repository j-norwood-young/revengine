(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[0],{

/***/ "./src/templates/listfilters.pug":
/*!***************************************!*\
  !*** ./src/templates/listfilters.pug ***!
  \***************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var pug = __webpack_require__(/*! ../../node_modules/pug-runtime/index.js */ "./node_modules/pug-runtime/index.js");

function template(locals) {var pug_html = "", pug_mixins = {}, pug_interp;;var locals_for_with = (locals || {});(function (filter, options) {pug_html = pug_html + "\u003Cdiv class=\"col-sm-2 col-xs-12\"\u003E\u003Cselect" + (" class=\"form-control list-filter\""+pug.attr("data-field", filter.field, true, true)+pug.attr("multiple", (filter.multiple), true, true)) + "\u003E\u003Coption value=\"*\"\u003E" + (pug.escape(null == (pug_interp = filter.name) ? "" : pug_interp)) + "\u003C\u002Foption\u003E";
// iterate options
;(function(){
  var $$obj = options;
  if ('number' == typeof $$obj.length) {
      for (var pug_index0 = 0, $$l = $$obj.length; pug_index0 < $$l; pug_index0++) {
        var option = $$obj[pug_index0];
pug_html = pug_html + "\u003Coption" + (pug.attr("value", option._id, true, true)) + "\u003E" + (pug.escape(null == (pug_interp = option.name) ? "" : pug_interp)) + "\u003C\u002Foption\u003E";
      }
  } else {
    var $$l = 0;
    for (var pug_index0 in $$obj) {
      $$l++;
      var option = $$obj[pug_index0];
pug_html = pug_html + "\u003Coption" + (pug.attr("value", option._id, true, true)) + "\u003E" + (pug.escape(null == (pug_interp = option.name) ? "" : pug_interp)) + "\u003C\u002Foption\u003E";
    }
  }
}).call(this);

pug_html = pug_html + "\u003C\u002Fselect\u003E\u003C\u002Fdiv\u003E";}.call(this,"filter" in locals_for_with?locals_for_with.filter:typeof filter!=="undefined"?filter:undefined,"options" in locals_for_with?locals_for_with.options:typeof options!=="undefined"?options:undefined));;return pug_html;};
module.exports = template;

/***/ })

}]);
//# sourceMappingURL=0.main.bundle.js.map