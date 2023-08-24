document.addEventListener("DOMContentLoaded", function (event) { 
    function checkPasswordsMatch() {
        // console.log("checkPasswordsMatch");
        const p1 = container.querySelector("input[name=password]").value;
        const p2 = container.querySelector("input[name=confirm_password]").value;
        if (!p1 || !p2) {
            container.querySelector("button").setAttribute("disabled", true);
            return;
        }
        if (p1 !== p2) {
            container.querySelector("button").setAttribute("disabled", true);
            return;
        }
        if (p1.length < 5) {
            container.querySelector("button").setAttribute("disabled", true);
            return;
        }
        container.querySelector("button").removeAttribute("disabled");
    }

    const container = document.querySelector(".change_password");
    if (container) {
        const inputs = container.querySelectorAll("input");
        for (input of inputs) {
            input.addEventListener("keyup", checkPasswordsMatch);   
        }
    }
})



