import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { extname, join, resolve, sep } from "node:path";

const TYPES: Record<string, string> = {
  ".json": "application/json",
  ".html": "text/html",
  ".md": "text/markdown",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".zip": "application/zip",
  ".js": "text/javascript",
  ".css": "text/css",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
};

export interface FolderSite {
  /** Send `Access-Control-Allow-Origin: *`, as Netlify does for a course, so a reader elsewhere can read it. */
  cors?: boolean;
  /** A file inside the folder answered for any path that names no file: a single-page app's fallback. */
  fallback?: string;
  /** A content security policy for every answer. */
  csp?: string;
}

/**
 * Serves `folder` on 127.0.0.1, from `firstPort` or the next free one of `count`, to GET and HEAD only, with no
 * caching so a reload reads the latest build. Nothing outside the folder is ever answered.
 */
export async function serveFolder(folder: string, firstPort: number, site: FolderSite = {}, count = 10): Promise<{ server: Server; port: number }> {
  const root = resolve(folder);
  for (let port = firstPort; port < firstPort + count; port++) {
    const candidate = createServer((request, response) => {
      if (site.cors) response.setHeader("Access-Control-Allow-Origin", "*");
      if (site.csp) response.setHeader("Content-Security-Policy", site.csp);
      response.setHeader("Cache-Control", "no-store");
      if (request.method !== "GET" && request.method !== "HEAD") return void response.writeHead(405).end();
      let path: string;
      try {
        path = decodeURIComponent(new URL(request.url ?? "/", "http://127.0.0.1").pathname);
      } catch {
        return void response.writeHead(400).end();
      }
      let file = resolve(root, `.${path}`);
      const inside = (candidate: string) => candidate === root || candidate.startsWith(`${root}${sep}`);
      const isFile = (candidate: string) => inside(candidate) && existsSync(candidate) && statSync(candidate).isFile();
      if (!isFile(file) && isFile(join(file, "index.html"))) file = join(file, "index.html");
      if (!isFile(file)) {
        if (!inside(file) || site.fallback === undefined || !isFile(join(root, site.fallback))) return void response.writeHead(404).end();
        file = join(root, site.fallback);
      }
      response.writeHead(200, { "Content-Type": TYPES[extname(file).toLowerCase()] ?? "application/octet-stream" });
      if (request.method === "HEAD") return void response.end();
      createReadStream(file).pipe(response);
    });
    const listening = await new Promise<boolean>((done) => {
      candidate.once("error", () => done(false));
      candidate.listen(port, "127.0.0.1", () => done(true));
    });
    if (listening) return { server: candidate, port };
  }
  throw new Error(`Ports ${firstPort} to ${firstPort + count - 1} are all in use on this computer.`);
}

export const closeServer = (server: Server | null) => new Promise<void>((done) => (server === null ? done() : server.close(() => done())));
