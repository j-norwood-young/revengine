const axios = require("axios");

class Progressbar {
    constructor() {
        const self = this;
        document.addEventListener("DOMContentLoaded", () => {
            self.els = document.querySelectorAll(".dynamic-progress");
            for (let el of self.els) {
                // console.log(el);
                const src = el.getAttribute("src");
                // console.log(src);
                const progressbar = el.querySelector(".progress-bar");
                const remaining = el.querySelector(".remaining");
                const complete = el.querySelector(".complete");
                const total = el.querySelector(".total");
                const perc = el.querySelector(".perc");
                const start_time = el.querySelector(".start_time");
                const time_remaining_human = el.querySelector(".time_remaining_human");
                if (src) {
                    const updatefn = async function() {
                        const data = (await axios.get(src)).data;
                        // console.log(data);
                        if (progressbar) {
                            progressbar.setAttribute("aria-valuenow", data.perc);
                            progressbar.style.width = `${data.perc}%`;
                        }
                        if (remaining) {
                            remaining.innerHTML = data.remaining;
                        }
                        if (complete) {
                            complete.innerHTML = data.complete;
                        }
                        if (total) {
                            total.innerHTML = data.total;
                        }
                        if (start_time) {
                            start_time.innerHTML = data.start_time;
                        }
                        if (time_remaining_human) {
                            time_remaining_human.innerHTML = data.time_remaining_human;
                        }
                        if (perc) {
                            perc.innerHTML = Math.round(data.perc);
                        }
                    }
                    setInterval(updatefn, 10000)
                    updatefn();
                }
            }
        })
    }
}

module.exports = Progressbar;