const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, "../..");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".jpg": "image/jpeg",
};
http
  .createServer((req, res) => {
    const file = path.resolve(
      root,
      "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname),
    );
    const pathname = new URL(req.url, "http://localhost").pathname;
    const target =
      pathname === "/mobile"
        ? path.join(root, "expo-app/dist/index.html")
        : (pathname.startsWith("/_expo/") || pathname.startsWith("/assets/"))
          ? path.join(root, "expo-app/dist", pathname)
          : file === root
            ? path.join(root, "index.html")
            : file;
    if (!target.startsWith(root + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(target, (error, data) => {
      if (error) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, {
        "Content-Type":
          types[path.extname(target)] || "application/octet-stream",
      });
      res.end(data);
    });
  })
  .listen(4173, "127.0.0.1");
