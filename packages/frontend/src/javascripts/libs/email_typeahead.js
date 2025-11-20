import "./typeahead.js";
import Bloodhound from "bloodhound-js";
const email_matcher = new Bloodhound({
    datumTokenizer: Bloodhound.tokenizers.whitespace,
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    remote: {
        url: `${apiserver}/api/reader?filter[email]=$regex:%QUERY&limit=10&fields=email&apikey=${apikey}`,
        wildcard: '%QUERY',
        filter: function (data) {
            const result = data.data.map(d => {
                return {
                    name: d.email,
                    id: d.id
                }
            });
            return result;
        }
    }
})

const tag_matcher = new Bloodhound({
    datumTokenizer: Bloodhound.tokenizers.whitespace,
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    remote: {
        url: `/report/typeahead/tag/%QUERY`,
        wildcard: '%QUERY',
        // filter: function (data) {
        //     const result = data.data.map(d => {
        //         return {
        //             name: d,
        //             id: d.id
        //         }
        //     });
        //     return result;
        // }
    }
})

document.addEventListener("DOMContentLoaded", async e => {
    
    $(".email_typeahead").typeahead({
        // hint: true,
        // highlight: true,
        minLength: 4,
    },
    {
        name: "email",
        displayKey: function(email) {
            return email.name;        
        },
        source: email_matcher
    });

    $(".tag_typeahead").typeahead({
        // hint: true,
        // highlight: true,
        minLength: 4,
    },
    {
        name: "tag",
        displayKey: function(tag) {
            return tag;        
        },
        source: tag_matcher
    })
});