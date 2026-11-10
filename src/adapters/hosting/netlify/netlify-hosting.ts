import type { BuiltFile, HostingOutcome, HostingPort } from "../../../application/ports/hosting.ts";
import type { SecretsPort } from "../../../application/ports/secrets.ts";

export const NETLIFY_API = "https://api.netlify.com/api/v1";
export const NETLIFY_TOKEN = "netlify-token";

/**
 * The headers and redirect Tutors' netlify.toml declares, as the files Netlify applies to a deploy made
 * through its API (a netlify.toml inside the uploaded folder is build configuration and is not read).
 */
export const NETLIFY_HEADERS = "/*\n  Access-Control-Allow-Origin: *\n";
export const NETLIFY_REDIRECTS = "/* /index.html 200\n";

export interface NetlifyOptions {
  secrets: SecretsPort;
  fetch?: typeof fetch;
  /** How long to wait for Netlify to finish processing a deploy, in milliseconds. */
  waitMs?: number;
  sleep?: (ms: number) => Promise<void>;
  /**
   * Studio's OAuth application id at Netlify, for signing in through the browser (Netlify's ticket flow,
   * as its own CLI signs in). Without one, the lecturer pastes a personal access token instead.
   */
  clientId?: string;
  /** How long to wait for the lecturer to approve Studio in the browser, in milliseconds. */
  signInWaitMs?: number;
}

/** Netlify's page where the lecturer approves Studio. */
export const NETLIFY_AUTHORIZE = "https://app.netlify.com/authorize";

async function sha1(bytes: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-1", bytes as BufferSource));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

const encodePath = (path: string) => path.split("/").map(encodeURIComponent).join("/");

class NetlifyError extends Error {
  constructor(
    readonly reason: string,
    readonly detail: string,
  ) {
    super(reason);
  }
}

/**
 * Netlify through its HTTP API, with a personal access token kept in the keychain: finds the site
 * <site>.netlify.app (creating it the first time), sends the built files' digests, uploads only the
 * files Netlify doesn't already have, and waits for the deploy to go live. No git, no Netlify CLI.
 */
export function netlifyHosting(options: NetlifyOptions): HostingPort {
  const http = options.fetch ?? fetch;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  async function call(token: string, method: string, path: string, body?: unknown, raw?: Uint8Array): Promise<{ status: number; json: Record<string, unknown> }> {
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (raw !== undefined) headers["Content-Type"] = "application/octet-stream";
    else if (body !== undefined) headers["Content-Type"] = "application/json";
    let response: Response;
    try {
      response = await http(`${NETLIFY_API}${path}`, { method, headers, body: raw !== undefined ? (raw as BodyInit) : body === undefined ? undefined : JSON.stringify(body) });
    } catch (error) {
      throw new NetlifyError("Studio couldn't reach Netlify. Check this computer is online and try again.", String(error));
    }
    const text = await response.text();
    if (response.status === 401 || response.status === 403)
      throw new NetlifyError("Netlify didn't accept the access token. Make a new one in Netlify (User settings, Applications, Personal access tokens) and sign in again.", text);
    let json: Record<string, unknown> = {};
    try {
      json = text === "" ? {} : (JSON.parse(text) as Record<string, unknown>);
    } catch {
      json = {};
    }
    return { status: response.status, json };
  }

  async function siteId(token: string, site: string): Promise<string> {
    const found = await call(token, "GET", `/sites/${site}.netlify.app`);
    if (found.status === 200) return String(found.json.id);
    const made = await call(token, "POST", "/sites", { name: site });
    if (made.status === 201 || made.status === 200) return String(made.json.id);
    if (made.status === 422)
      throw new NetlifyError(`The Netlify name "${site}" belongs to another Netlify account. Choose another name for the course's site.`, JSON.stringify(made.json));
    throw new NetlifyError("Netlify wouldn't create the site.", `${made.status} ${JSON.stringify(made.json)}`);
  }

  return {
    name: "Netlify",
    async signedIn() {
      return Boolean(await options.secrets.get(NETLIFY_TOKEN));
    },
    async signIn(token: string) {
      await options.secrets.set(NETLIFY_TOKEN, token.trim());
    },
    async signOut() {
      await options.secrets.set(NETLIFY_TOKEN, "");
    },
    ...(options.clientId
      ? {
          async browserSignIn(open: (url: string) => void): Promise<{ ok: true } | { ok: false; reason: string }> {
            const unreachable = { ok: false as const, reason: "Studio couldn't reach Netlify. Check this computer is online and try again." };
            const post = async (path: string) => {
              try {
                const response = await http(`${NETLIFY_API}${path}`, { method: "POST" });
                return response.ok ? ((await response.json()) as Record<string, unknown>) : null;
              } catch {
                return null;
              }
            };
            const ticket = await post(`/oauth/tickets?client_id=${encodeURIComponent(options.clientId!)}`);
            if (ticket === null || typeof ticket.id !== "string") return unreachable;
            open(`${NETLIFY_AUTHORIZE}?response_type=ticket&ticket=${encodeURIComponent(ticket.id)}`);
            const deadline = options.signInWaitMs ?? 300_000;
            for (let waited = 0; waited <= deadline; waited += 2000) {
              try {
                const state = await http(`${NETLIFY_API}/oauth/tickets/${encodeURIComponent(ticket.id)}`);
                if (state.ok && ((await state.json()) as Record<string, unknown>).authorized === true) {
                  const exchanged = await post(`/oauth/tickets/${encodeURIComponent(ticket.id)}/exchange`);
                  if (exchanged === null || typeof exchanged.access_token !== "string") return unreachable;
                  await options.secrets.set(NETLIFY_TOKEN, exchanged.access_token);
                  return { ok: true };
                }
              } catch {
                // Offline for a moment; keep waiting for the lecturer.
              }
              await sleep(2000);
            }
            return { ok: false, reason: "Netlify didn't hear that you approved Studio. Sign in again, and press Authorize on Netlify's page." };
          },
        }
      : {}),
    async deploy(site: string, built: BuiltFile[]): Promise<HostingOutcome> {
      const token = await options.secrets.get(NETLIFY_TOKEN);
      if (!token) return { ok: false, reason: "Sign in to Netlify first, under Settings, Accounts.", detail: "" };
      const encoder = new TextEncoder();
      const files = [
        ...built.filter((file) => file.path !== "_headers" && file.path !== "_redirects"),
        { path: "_headers", bytes: encoder.encode(NETLIFY_HEADERS) },
        { path: "_redirects", bytes: encoder.encode(NETLIFY_REDIRECTS) },
      ];
      try {
        const id = await siteId(token, site);
        const digests = new Map<string, BuiltFile[]>();
        const manifest: Record<string, string> = {};
        for (const file of files) {
          const digest = await sha1(file.bytes);
          manifest[`/${file.path}`] = digest;
          digests.set(digest, [...(digests.get(digest) ?? []), file]);
        }
        const deploy = await call(token, "POST", `/sites/${id}/deploys`, { files: manifest });
        if (deploy.status !== 200 && deploy.status !== 201) throw new NetlifyError("Netlify wouldn't start the deploy.", `${deploy.status} ${JSON.stringify(deploy.json)}`);
        const deployId = String(deploy.json.id);
        const required = (deploy.json.required as string[] | undefined) ?? [];
        let uploaded = 0;
        for (const digest of required) {
          const [file] = digests.get(digest) ?? [];
          if (file === undefined) continue;
          const put = await call(token, "PUT", `/deploys/${deployId}/files/${encodePath(file.path)}`, undefined, file.bytes);
          if (put.status !== 200) throw new NetlifyError(`Netlify refused the file ${file.path}.`, `${put.status} ${JSON.stringify(put.json)}`);
          uploaded++;
        }
        const deadline = options.waitMs ?? 120_000;
        for (let waited = 0; ; waited += 2000) {
          const state = await call(token, "GET", `/deploys/${deployId}`);
          if (state.json.state === "ready") return { ok: true, siteUrl: String(state.json.ssl_url ?? `https://${site}.netlify.app`), uploaded };
          if (state.json.state === "error") throw new NetlifyError("Netlify couldn't finish the deploy.", String(state.json.error_message ?? ""));
          if (waited >= deadline) throw new NetlifyError("Netlify is still processing the deploy. It will usually go live in a minute; check the site then.", "");
          await sleep(2000);
        }
      } catch (error) {
        if (error instanceof NetlifyError) return { ok: false, reason: error.reason, detail: error.detail };
        throw error;
      }
    },
  };
}
