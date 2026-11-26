const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3001;
const ROOT = __dirname;

const MIME = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg"
};

const server = http.createServer((req, res) => {
    let safeUrl = req.url.split("?")[0];
    let filePath = path.join(ROOT, safeUrl === "/" ? "index.html" : safeUrl);
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403);
        return res.end("Forbidden");
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || "text/plain";

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404, { "Content-Type": "text/plain" });
            return res.end("404 Not Found");
        }
        res.writeHead(200, { "Content-Type": contentType });
        res.end(content);
    });
});

server.listen(PORT, () => {
    console.log(`Experiment 1 (Floor Plan Layout) running at http://localhost:${PORT}`);
});
