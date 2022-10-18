const utmExtractor = require("utm-extractor").Utm;
const Referer = require("referer-parser");

module.exports.parse_utm = function (url) {
    let utm = {};
    try {
        utm = new utmExtractor(url).get();
    } catch (err) {
        utm = {
            utm_medium: null,
            utm_campaign: null,
            utm_content: null,
            utm_source: null,
            utm_term: null,
        };
    }
    if (utm.utm_medium === "email") derived_referer_medium = "email";
    return {
        derived_utm_campaign: utm.utm_campaign,
        derived_utm_content: utm.utm_content,
        derived_utm_medium: utm.utm_medium,
        derived_utm_source: utm.utm_source,
        derived_utm_term: utm.utm_term,
    }
}

module.exports.parse_utm_test = function () {
    const url = "https://www.example.com/?utm_medium=email&utm_campaign=welcome&utm_content=button&utm_source=mailchimp&utm_term=click";
    const expected = {
        derived_utm_campaign: "welcome",
        derived_utm_content: "button",
        derived_utm_medium: "email",
        derived_utm_source: "mailchimp",
        derived_utm_term: "click",
    }
    const actual = module.exports.parse_utm(url);
    console.log(actual);
    console.assert(JSON.stringify(actual) === JSON.stringify(expected));
}

module.exports.parse_utm_test();