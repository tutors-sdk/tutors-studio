import type { ProcessPort, ProcessResult, Tool } from "../../src/application/ports/process.ts";
import type { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import type { SaveCopyOutcome, SaveCopyPort } from "../../src/application/ports/save-copy.ts";

/**
 * A computer for the publishing tests: which tools are installed, what each call does, and every call
 * made. "Running" the generator writes a small json/ build into the course, the way `tutors` does.
 */
export class FakeComputer implements ProcessPort {
  readonly calls: string[] = [];
  /** What `tutors validate --format json` prints: a clean report unless a test says otherwise. */
  validateReport = "[]\n";
  constructor(
    private readonly course: MemoryFileSystem,
    private readonly installed: Tool[],
    private readonly failing: string[] = [],
  ) {}

  async run(tool: Tool, args: string[]): Promise<ProcessResult> {
    const call = `${tool} ${args.join(" ")}`;
    this.calls.push(call);
    if (!this.installed.includes(tool)) return { code: null, stdout: "", stderr: `spawn ${tool} ENOENT` };
    if (this.failing.some((part) => call.includes(part))) return { code: 1, stdout: "", stderr: `error: ${call} failed\nline two` };
    if (call.includes(" validate . --format json")) return { code: this.validateReport.includes('"error"') ? 1 : 0, stdout: this.validateReport, stderr: "" };
    if (call.includes("jsr:@tutors/tutors@")) {
      await this.course.write("json/tutors.json", new TextEncoder().encode('{"title":"Web Development"}'));
      await this.course.write("json/index.html", new TextEncoder().encode("<html></html>"));
      await this.course.write("json/topic-01/talk-1/slides.pdf", new TextEncoder().encode("%PDF"));
    }
    if (call.includes("jsr:@tutors/tutors-lite@")) {
      await this.course.write("html/index.html", new TextEncoder().encode("<h1>Web Development</h1>"));
      await this.course.write("html/topic-01/talk-1/index.html", new TextEncoder().encode("<h1>Intro</h1>"));
      await this.course.write("html/topic-01/talk-1/slides.pdf", new TextEncoder().encode("%PDF"));
    }
    return { code: 0, stdout: tool === "deno" && args[0] === "--version" ? "deno 2.9.6" : "", stderr: "" };
  }
}

interface Deploy {
  site: string;
  files: Record<string, string>;
  required: string[];
  uploaded: string[];
}

/** Netlify's API in memory: sites by name, deploys by id, a token it accepts, and files it already holds. */
export class FakeNetlify {
  readonly sites = new Map<string, string>();
  readonly deploys = new Map<string, Deploy>();
  readonly requests: string[] = [];
  /** Content digests Netlify already holds from earlier deploys, so they aren't asked for again. */
  readonly known = new Set<string>();
  takenNames = new Set<string>();

  constructor(private readonly token = "good-token") {}

  fetch = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
    const url = new URL(String(input));
    const path = url.pathname.replace("/api/v1", "");
    const method = init.method ?? "GET";
    this.requests.push(`${method} ${path}`);
    const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
    if ((init.headers as Record<string, string>).Authorization !== `Bearer ${this.token}`) return json(401, { code: 401, message: "Access Denied" });
    let match = /^\/sites\/([^/]+)\.netlify\.app$/.exec(path);
    if (method === "GET" && match) return this.sites.has(match[1]) ? json(200, { id: this.sites.get(match[1]) }) : json(404, {});
    if (method === "POST" && path === "/sites") {
      const { name } = JSON.parse(String(init.body)) as { name: string };
      if (this.takenNames.has(name)) return json(422, { errors: { subdomain: ["must be unique"] } });
      this.sites.set(name, `site-${name}`);
      return json(201, { id: `site-${name}` });
    }
    match = /^\/sites\/([^/]+)\/deploys$/.exec(path);
    if (method === "POST" && match) {
      const { files } = JSON.parse(String(init.body)) as { files: Record<string, string> };
      const id = `deploy-${this.deploys.size + 1}`;
      const required = [...new Set(Object.values(files))].filter((digest) => !this.known.has(digest));
      this.deploys.set(id, { site: match[1], files, required, uploaded: [] });
      return json(200, { id, required });
    }
    match = /^\/deploys\/([^/]+)\/files\/(.+)$/.exec(path);
    if (method === "PUT" && match) {
      this.deploys.get(match[1])!.uploaded.push(decodeURIComponent(match[2]));
      return json(200, {});
    }
    match = /^\/deploys\/([^/]+)$/.exec(path);
    if (method === "GET" && match) {
      const deploy = this.deploys.get(match[1])!;
      const site = [...this.sites.entries()].find(([, id]) => id === deploy.site)![0];
      return json(200, { state: "ready", ssl_url: `https://${site}.netlify.app` });
    }
    return json(404, { message: `no route ${method} ${path}` });
  };
}

/** The lecturer's own folders, outside the course: files by full path. Copies come from the course in memory, never over a folder already there. */
export class FakeFolders implements SaveCopyPort {
  readonly files = new Map<string, string>();
  constructor(private readonly course: MemoryFileSystem) {}

  folderExists = (folder: string) => [...this.files.keys()].some((path) => path.startsWith(`${folder}/`));

  async saveCopy(from: string, parent: string, name: string): Promise<SaveCopyOutcome> {
    let n = 1;
    while (this.folderExists(`${parent}/${n === 1 ? name : `${name}-${n}`}`)) n++;
    const folder = `${parent}/${n === 1 ? name : `${name}-${n}`}`;
    for (const [path, text] of Object.entries(this.course.snapshot())) if (path.startsWith(`${from}/`)) this.files.set(`${folder}/${path.slice(from.length + 1)}`, text);
    return { ok: true, folder };
  }
}
