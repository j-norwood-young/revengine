const JXPHelper = require("jxp-helper");
const jxphelper = new JXPHelper({ server: apiserver, apikey });

class ReaderView {
    constructor() {
        const self = this;
        document.addEventListener("DOMContentLoaded", () => {
            console.log("ReaderView");
            self.el_send_uber_code = document.querySelector("#send_uber_code");
            console.log(self.el_send_uber_code);
            self.el_send_uber_code.addEventListener("change", self.changeSendUberCode.bind(self))
        });
    }

    async changeSendUberCode() {
        const uber_code_override = this.el_send_uber_code.value;
        try {
            await jxphelper.put("reader", reader_id, { uber_code_override });
        } catch(err) {
            console.error(err);
            alert("Something went wrong");
        }
    }
}

module.exports = ReaderView;