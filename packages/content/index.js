const config = require("config");
const axios = require("axios");

const test = async () => {
    const result = await axios.get(`${config.content.wordpress_api}/posts`)
    console.log(result);
}

test();