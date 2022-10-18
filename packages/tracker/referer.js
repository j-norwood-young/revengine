const Referer = require("referer-parser");

module.exports.parse_referer = function (referer, url) {
    let derived_referer_medium = "direct";
    let derived_referer_source = "";
    if (referer) {
        let derived_referer = new Referer(referer, url);
        derived_referer_medium = derived_referer.medium;
        derived_referer_source = derived_referer.referer;
        if (derived_referer_medium === "unknown")
            derived_referer_medium = "external";
    }
    return {
        derived_referer_medium,
        derived_referer_source,
    }
}

module.exports.parse_referer_test = function () {
    const url = "https://www.example.com/";
    const referer = "https://www.google.com/";
    const expected = {
        derived_referer_medium: "search",
        derived_referer_source: "Google",
    }
    const actual = module.exports.parse_referer(referer, url);
    console.log(actual);
    console.assert(JSON.stringify(actual) === JSON.stringify(expected));
}

module.exports.parse_referer_test();