// Server statico minimo per la scena 3D (solo file locali della cartella dello spot)
import http from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { join, extname, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), ".."));
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".hdr": "application/octet-stream", ".ttf": "font/ttf" };

export function startServer(port = 0) {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      const file = resolve(join(ROOT, decodeURIComponent(req.url.split("?")[0])));
      if (!file.startsWith(ROOT) || !existsSync(file) || statSync(file).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
      createReadStream(file).pipe(rsp);
    });
    srv.listen(port, "127.0.0.1", () => res({ srv, url: `http://127.0.0.1:${srv.address().port}` }));
  });
}
