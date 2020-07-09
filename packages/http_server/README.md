# RevEngine HTTP server

A little HTTP server that includes authentication against our API

```javascript
const server = require("@revengine/http_server");
server.get("/hello", (req, res, next) => {
    res.send("Hello World");
});

server.listen(config.port, function () {
    console.log('%s listening at %s', server.name, server.url);
});

```