// S1: serves a folder on 127.0.0.1. `--fallback 200.html` answers unknown paths with that file (the
// static reader); `--cors` sends the headers a course server needs. Stands in for Studio's live.rs.
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";

const [, , rootArg, port, ...flags] = process.argv;
const root = resolve(rootArg);
const fallback = flags.includes("--fallback") ? flags[flags.indexOf("--fallback") + 1] : null;
const cors = flags.includes("--cors");
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".pdf": "application/pdf", ".wasm": "application/wasm" };

createServer((request, response) => {
  const path = normalize(decodeURIComponent(new URL(request.url, "http://x").pathname)).replace(/^([/\\])+/, "");
  let file = join(root, path);
  if (!file.startsWith(root)) return response.writeHead(403).end();
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  let status = 200;
  if (!existsSync(file)) {
    if (fallback === null) return response.writeHead(404).end("not found");
    file = join(root, fallback);
    console.log(`fallback ${request.url}`);
  }
  const headers = { "content-type": types[extname(file)] ?? "application/octet-stream" };
  if (cors) Object.assign(headers, { "access-control-allow-origin": "*", "cache-control": "no-store" });
  response.writeHead(status, headers).end(readFileSync(file));
}).listen(Number(port), "127.0.0.1", () => console.log(`serving ${root} on 127.0.0.1:${port}`));
