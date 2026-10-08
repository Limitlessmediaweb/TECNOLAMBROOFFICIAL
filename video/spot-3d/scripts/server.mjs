// Server statico minimo per la scena: solo le cartelle che servono (three, font del sito, logo, spot).
import http from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { join, extname, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = resolve(join(dirname(fileURLToPath(import.meta.url)), "..", "..", ".."));
const ALLOW = ["/node_modules/three/", "/video/spot-3d/", "/src/app/fonts/", "/public/brand/"];
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".hdr": "application/octet-stream", ".ttf": "font/ttf", ".woff2": "font/woff2" };

export function startServer(port = 0) {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      const path = decodeURIComponent(req.url.split("?")[0]);
      const file = resolve(join(SITE, path));
      if (!ALLOW.some((a) => path.startsWith(a)) || !file.startsWith(SITE) || !existsSync(file) || statSync(file).isDirectory()) {
        rsp.writeHead(404);
        return rsp.end();
      }
      rsp.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
      createReadStream(file).pipe(rsp);
    });
    srv.listen(port, "127.0.0.1", () => res({ srv, url: `http://127.0.0.1:${srv.address().port}` }));
  });
}
