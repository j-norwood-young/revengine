require("./typeahead");
const Bloodhound = require("bloodhound-js");
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
            console.log(result);
            return result;
        }
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
            console.log({ email });
            return email.name;        
        },
        source: email_matcher
    })
});