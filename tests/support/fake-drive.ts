/**
 * Google Drive's HTTP API in memory, for the Drive adapter's tests (ADR 0064): the calls Studio makes, answered
 * the way Drive answers them. Files and folders are kept by id; a token must be one the fake was given.
 */
const FOLDER = "application/vnd.google-apps.folder";

interface Item {
  id: string;
  name: string;
  mimeType: string;
  parent: string | null;
  bytes?: Uint8Array;
}

export function fakeDrive(options: { tokens?: string[] } = {}) {
  const items = new Map<string, Item>();
  const tokens = new Set(options.tokens ?? ["good"]);
  const calls: string[] = [];
  let n = 0;
  const add = (name: string, parent: string | null, mimeType: string, bytes?: Uint8Array) => {
    const id = `id${String(++n).padStart(10, "0")}`;
    items.set(id, { id, name, parent, mimeType, bytes });
    return id;
  };
  const root = add("Shared drive folder", null, FOLDER);
  /** Puts files in a folder by path, making the folders on the way. */
  const put = (parent: string, files: Record<string, string>) => {
    for (const [path, text] of Object.entries(files)) {
      let at = parent;
      const parts = path.split("/");
      for (const part of parts.slice(0, -1)) at = [...items.values()].find((i) => i.parent === at && i.name === part && i.mimeType === FOLDER)?.id ?? add(part, at, FOLDER);
      add(parts[parts.length - 1], at, "application/octet-stream", new TextEncoder().encode(text));
    }
  };
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  const fetch = async (input: string | URL | Request, init: RequestInit = {}): Promise<Response> => {
    const url = new URL(String(input));
    const method = init.method ?? "GET";
    calls.push(`${method} ${url.pathname}`);
    if (url.hostname === "oauth2.googleapis.com") {
      const form = new URLSearchParams(String(init.body));
      if (form.get("grant_type") === "refresh_token" && form.get("refresh_token") === "refresh-1") {
        tokens.add("fresh");
        return json({ access_token: "fresh", expires_in: 3600 });
      }
      if (form.get("grant_type") === "authorization_code" && form.get("code") === "the-code" && form.get("code_verifier")) {
        tokens.add("signed");
        return json({ access_token: "signed", refresh_token: "refresh-1", expires_in: 3600 });
      }
      return json({ error: "invalid_grant" }, 400);
    }
    const auth = new Headers(init.headers).get("Authorization") ?? "";
    if (!tokens.has(auth.replace(/^Bearer /, ""))) return json({ error: { code: 401 } }, 401);
    const upload = url.pathname.startsWith("/upload/");
    const id = /\/files\/([^/]+)$/.exec(url.pathname)?.[1];
    const bytesOf = async () => new Uint8Array(await new Response(init.body as BodyInit).arrayBuffer());
    if (method === "GET" && id === undefined) {
      const parent = /^'([^']+)' in parents/.exec(url.searchParams.get("q") ?? "")?.[1];
      const files = [...items.values()]
        .filter((i) => i.parent === parent)
        .map((i) => ({ id: i.id, name: i.name, mimeType: i.mimeType, ...(i.bytes ? { size: String(i.bytes.length) } : {}) }));
      return json({ files });
    }
    const item = id === undefined ? undefined : items.get(decodeURIComponent(id));
    if (id !== undefined && item === undefined) return json({ error: { code: 404 } }, 404);
    if (method === "GET" && url.searchParams.get("alt") === "media") return new Response(item!.bytes as BodyInit);
    if (method === "GET") return json({ id: item!.id, name: item!.name, mimeType: item!.mimeType });
    if (method === "DELETE") {
      items.delete(item!.id);
      return new Response(null, { status: 204 });
    }
    if (method === "PATCH" && upload) {
      item!.bytes = await bytesOf();
      return json({ id: item!.id });
    }
    if (method === "POST" && !upload) {
      const meta = JSON.parse(String(init.body)) as { name: string; mimeType: string; parents: string[] };
      return json({ id: add(meta.name, meta.parents[0], meta.mimeType), name: meta.name, mimeType: meta.mimeType });
    }
    if (method === "POST" && upload) {
      const body = await bytesOf();
      const text = new TextDecoder("latin1").decode(body);
      const boundary = /boundary=(\S+)/.exec(new Headers(init.headers).get("Content-Type") ?? "")![1];
      const [, metaPart, filePart] = text.split(`--${boundary}`);
      const meta = JSON.parse(metaPart.slice(metaPart.indexOf("\r\n\r\n") + 4).trim()) as { name: string; parents: string[] };
      const start = text.indexOf(filePart) + filePart.indexOf("\r\n\r\n") + 4;
      const end = text.indexOf(`\r\n--${boundary}--`);
      return json({ id: add(meta.name, meta.parents[0], "application/octet-stream", body.slice(start, end)) });
    }
    return json({ error: { code: 400 } }, 400);
  };

  /** Every path under a folder, files only, as "path:text". */
  const paths = (parent = root, prefix = ""): string[] =>
    [...items.values()]
      .filter((i) => i.parent === parent)
      .flatMap((i) => (i.mimeType === FOLDER ? paths(i.id, `${prefix}${i.name}/`) : [`${prefix}${i.name}`]))
      .sort();
  return { fetch: fetch as typeof globalThis.fetch, root, put, add, paths, calls, items };
}
