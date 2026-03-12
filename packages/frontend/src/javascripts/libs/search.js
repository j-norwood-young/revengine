import axios, { CancelToken } from "axios";
let cancel;

class Search {

    constructor() {
        const self = this;
        self.primarySearchTimer = null;
        self.lastSearch = "";
        self.searchRequest = null;
        document.addEventListener("DOMContentLoaded", () => {
            self.primarySearch = document.querySelector("#primarySearch");
            if (!self.primarySearch) return;
            self.primarySearchResults = document.querySelector("#primarySearchResults");
            self.primarySearch.addEventListener("keyup", (self.handleKeyup).bind(self));
            self.primarySearch.addEventListener("blur", self.hidePrimarySearch.bind(self));
            self.primarySearch.addEventListener("focus", self.showPrimarySearch.bind(self));
        });
    }

    handleKeyup(e) {
        const self = this;
        var search = self.primarySearch.value;
        if (self.lastSearch === search) return;
        clearTimeout(self.primarySearchTimer);
        if (e.keyCode == 13) {
            return self.doPrimarySearch();
        }
        self.primarySearchTimer = setTimeout((self.doPrimarySearch).bind(self), 300);
    }

    hidePrimarySearch(e) {
        if (e.relatedTarget && e.relatedTarget.className == "dropdown-item") return;
        this.primarySearchResults.style.display = 'none';
    }

    showPrimarySearch() {
        if (this.primarySearch.value && self.primarySearchResults.innerHTML)
            this.primarySearchResults.style.display = 'block';
    }

    searchResults(results) {
        console.log(results);
        const self = this;
        var data = results.data;
        self.primarySearchResults.innerHTML = "";
        self.primarySearchResults.style.display = 'none';
        if (!data.length) {
            self.primarySearchResults.innerHTML = `<a class='dropdown-item' href='#'>No results for ${results.search}</a>`;
            return;
        }
        let s = "";
        data.forEach(function (d) {
            s += `<a class='dropdown-item' href='/reader/view/${d._id}'>${d.first_name} ${d.last_name} (${d.email})</a>\n`;
        });
        // self.primarySearchResults.find("li").first().addClass("border-top");
        self.primarySearchResults.innerHTML = s;
        self.primarySearchResults.style.display = 'block';
    }

    async doPrimarySearch() {
        const self = this;
        var search = self.primarySearch.value;
        if (self.lastSearch === search)
            return;
        if (!search) {
            self.primarySearchResults.innerHTML = "";
            self.primarySearchResults.style.display = 'none';
            self.lastSearch = "";
            return;
        }
        self.lastSearch = search;
        self.primarySearchResults.innerHTML = "<a class='dropdown-item' href='#'><span class='spinner-border spinner-border-sm'></span> Thinking...</a>";
        this.showPrimarySearch();
        
        if (self.searchRequest != null) {
            self.searchRequest.abort();
            self.searchRequest = null;
        }
        if (cancel) cancel();
        const result = await axios.post("/search/q", { search }, {
            cancelToken: new CancelToken(function executor(c) {
                // An executor function receives a cancel function as a parameter
                cancel = c;
            })
        });
        this.searchResults(result.data);
    }
}

export default Search;
