const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const RPC_TARGET = "http://127.0.0.1:8545";
const WEB_DIR = __dirname;
const ETHERSPATH = path.join(__dirname, "..", "node_modules", "ethers", "dist", "ethers.umd.min.js");

function serveFile(res, filePath, contentType) {
  if (!contentType) {
    const ext = path.extname(filePath);
    const types = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".json": "application/json",
      ".ico": "image/x-icon",
    };
    contentType = types[ext] || "application/octet-stream";
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

function proxyRpc(req, res) {
  const body = [];
  req.on("data", (chunk) => body.push(chunk));
  req.on("end", () => {
    const buf = Buffer.concat(body);
    const opts = require("url").parse(RPC_TARGET);
    opts.method = "POST";
    opts.headers = { "Content-Type": "application/json", "Content-Length": buf.length };
    const proxy = http.request(opts, (rpcRes) => {
      res.writeHead(rpcRes.statusCode, { "Content-Type": "application/json" });
      rpcRes.pipe(res);
    });
    proxy.on("error", (e) => {
      res.writeHead(502);
      res.end(JSON.stringify({ error: "RPC 不可达，请先运行 npm run node。", detail: e.message }));
    });
    proxy.end(buf);
  });
}

const server = http.createServer((req, res) => {
  const url = req.url === "/" ? "/index.html" : req.url;
  if (req.method === "POST" && (url === "/rpc" || url.startsWith("/rpc"))) {
    proxyRpc(req, res);
    return;
  }
  if (url === "/vendor/ethers.umd.min.js" || url === "/ethers.umd.min.js") {
    serveFile(res, ETHERSPATH, "application/javascript");
    return;
  }
  const filePath = path.join(WEB_DIR, path.normalize(url).replace(/^(\.\.(\/|\\))+/, ""));
  serveFile(res, filePath);
});

server.listen(PORT, () => {
  console.log("FitCamp 前端: http://localhost:" + PORT);
  console.log("RPC 代理: POST /rpc -> " + RPC_TARGET + "（请确保已运行 npm run node）");
});
