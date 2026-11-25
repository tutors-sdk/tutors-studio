import type { DriveAccountPort } from "../../../application/ports/drive.ts";
import type { DirEntry } from "../../../application/ports/file-system.ts";
import type { LibraryPort } from "../../../application/ports/library.ts";
import type { RegistryPort } from "../../../application/ports/registry.ts";
import type { SecretsPort } from "../../../application/ports/secrets.ts";
import { driveFolderId } from "../../../domain/drive.ts";

export const DRIVE_API = "https://www.googleapis.com/drive/v3";
export const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3";
export const GOOGLE_AUTHORIZE = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
/** Full Drive access: a registry is often a folder a colleague shared, which Studio did not create. */
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
/** The keychain entry (ADR 0016): an access token, or JSON with the refresh token and when the access token expires. */
export const DRIVE_TOKEN = "google-drive-token";

const FOLDER = "application/vnd.google-apps.folder";

export interface GoogleDriveOptions {
  secrets: SecretsPort;
  fetch?: typeof fetch;
  /** Studio's OAuth client at Google (a desktop app client), for signing in through the browser and refreshing. */
  clientId?: string;
  /** A desktop app client's secret, which Google says is not secret for installed apps. */
  clientSecret?: string;
  /** Listens on 127.0.0.1 for Google's redirect, and resolves to its query string. The app's Rust side. */
  loopback?: () => Promise<{ redirectUri: string; query: Promise<string> }>;
  now?: () => number;
}

interface Stored {
  access: string;
  refresh?: string;
  /** Milliseconds since 1970 when the access token stops working. */
  expires?: number;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
}

const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");

/**
 * Google Drive through its HTTP API (ADR 0064): library folders and registries in Drive folders, read and written
 * by path the way the disk adapters are, with the sign-in in the keychain. No Google SDK: fetch only.
 */
export function googleDrive(options: GoogleDriveOptions): { library: LibraryPort; registry: RegistryPort; account: DriveAccountPort } {
  const http = options.fetch ?? fetch;
  const now = options.now ?? Date.now;
  const children = new Map<string, Promise<DriveFile[]>>();

  async function stored(): Promise<Stored | null> {
    const raw = await options.secrets.get(DRIVE_TOKEN);
    if (raw === null || raw === "") return null;
    try {
      const parsed = JSON.parse(raw) as Stored;
      if (typeof parsed.access === "string") return parsed;
    } catch {
      // A pasted access token, kept as it is.
    }
    return { access: raw };
  }

  async function exchange(form: Record<string, string>): Promise<Stored> {
    const response = await http(GOOGLE_TOKEN, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(form).toString() });
    const json = (await response.json()) as { access_token?: string; refresh_token?: string; expires_in?: number; error_description?: string; error?: string };
    if (!response.ok || json.access_token === undefined) throw new Error(`Google didn't sign Studio in: ${json.error_description ?? json.error ?? response.status}`);
    return { access: json.access_token, refresh: json.refresh_token, expires: now() + (json.expires_in ?? 3600) * 1000 };
  }

  async function token(): Promise<string> {
    const current = await stored();
    if (current === null) throw new Error("Studio isn't signed in to Google Drive: sign in first.");
    if (current.expires === undefined || current.expires - 60_000 > now() || current.refresh === undefined || options.clientId === undefined) return current.access;
    const fresh = await exchange({
      grant_type: "refresh_token",
      refresh_token: current.refresh,
      client_id: options.clientId,
      ...(options.clientSecret ? { client_secret: options.clientSecret } : {}),
    });
    await options.secrets.set(DRIVE_TOKEN, JSON.stringify({ ...fresh, refresh: fresh.refresh ?? current.refresh }));
    return fresh.access;
  }

  async function call(url: string, init: RequestInit = {}, what = "Google Drive"): Promise<Response> {
    const response = await http(url, { ...init, headers: { ...(init.headers as Record<string, string> | undefined), Authorization: `Bearer ${await token()}` } });
    if (response.status === 401) throw new Error("Google Drive asked Studio to sign in again: sign in to Google Drive in Settings.");
    if (response.status === 403) throw new Error(`${what}: your Google account can't open this. Ask its owner to share the folder with you.`);
    if (response.status === 404) throw new Error(`${what}: not found in Google Drive.`);
    if (!response.ok) throw new Error(`${what}: Google Drive answered ${response.status}.`);
    return response;
  }

  function listChildren(parent: string): Promise<DriveFile[]> {
    let found = children.get(parent);
    if (found === undefined) {
      found = (async () => {
        const files: DriveFile[] = [];
        let page: string | undefined;
        do {
          const query = new URLSearchParams({
            q: `'${parent}' in parents and trashed=false`,
            fields: "nextPageToken,files(id,name,mimeType,size)",
            pageSize: "1000",
            supportsAllDrives: "true",
            includeItemsFromAllDrives: "true",
            ...(page ? { pageToken: page } : {}),
          });
          const json = (await (await call(`${DRIVE_API}/files?${query}`)).json()) as { files: DriveFile[]; nextPageToken?: string };
          files.push(...json.files);
          page = json.nextPageToken;
        } while (page);
        return files;
      })();
      found.catch(() => children.delete(parent));
      children.set(parent, found);
    }
    return found;
  }

  const rootOf = (folder: string) => {
    const id = driveFolderId(folder);
    if (id === null) throw new Error(`${folder}: not a Google Drive folder`);
    return id;
  };
  const parts = (path: string) => path.split("/").filter((part) => part !== "" && part !== ".");

  /** The Drive file at a path inside a folder, or null; ".." is refused, as the disk adapters refuse leaving the folder. */
  async function find(folder: string, path: string): Promise<DriveFile | null> {
    let current: DriveFile = { id: rootOf(folder), name: "", mimeType: FOLDER };
    for (const part of parts(path)) {
      if (part === "..") throw new Error(`${path}: outside the folder`);
      if (current.mimeType !== FOLDER) return null;
      const next = (await listChildren(current.id)).find((file) => file.name === part);
      if (next === undefined) return null;
      current = next;
    }
    return current;
  }

  async function folderAt(folder: string, path: string): Promise<string> {
    let parent = rootOf(folder);
    for (const part of parts(path)) {
      if (part === "..") throw new Error(`${path}: outside the folder`);
      const existing = (await listChildren(parent)).find((file) => file.name === part && file.mimeType === FOLDER);
      if (existing !== undefined) {
        parent = existing.id;
        continue;
      }
      const made = (await (
        await call(`${DRIVE_API}/files?supportsAllDrives=true&fields=id,name,mimeType`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: part, mimeType: FOLDER, parents: [parent] }),
        })
      ).json()) as DriveFile;
      children.delete(parent);
      parent = made.id;
    }
    return parent;
  }

  const library: LibraryPort = {
    async list(folder, dir) {
      const at = await find(folder, dir);
      if (at === null || at.mimeType !== FOLDER) throw new Error(`${dir || "the folder"}: not a folder in Google Drive`);
      // Google Docs, Sheets and Slides have no bytes to read, so a course never holds one as a file.
      return (await listChildren(at.id)).flatMap((file): DirEntry[] =>
        file.mimeType === FOLDER
          ? [{ name: file.name, kind: "dir" }]
          : file.mimeType.startsWith("application/vnd.google-apps.")
            ? []
            : [{ name: file.name, kind: "file", ...(file.size ? { size: Number(file.size) } : {}) }],
      );
    },
    async read(folder, path) {
      const at = await find(folder, path);
      if (at === null || at.mimeType === FOLDER) throw new Error(`${path}: not found in Google Drive.`);
      return new Uint8Array(await (await call(`${DRIVE_API}/files/${encodeURIComponent(at.id)}?alt=media&supportsAllDrives=true`, {}, path)).arrayBuffer());
    },
  };

  const registry: RegistryPort = {
    async write(folder, path, bytes) {
      // Only into a registry, or the registry.json that starts one, as on the disk (ADR 0063).
      if (path !== "registry.json" && (await find(folder, "registry.json")) === null) throw new Error(`${folder}: not a registry`);
      const slash = path.lastIndexOf("/");
      const parent = await folderAt(folder, slash < 0 ? "" : path.slice(0, slash));
      const name = path.slice(slash + 1);
      const existing = (await listChildren(parent)).find((file) => file.name === name && file.mimeType !== FOLDER);
      if (existing !== undefined) {
        await call(`${DRIVE_UPLOAD}/files/${encodeURIComponent(existing.id)}?uploadType=media&supportsAllDrives=true`, { method: "PATCH", body: bytes as BodyInit }, path);
      } else {
        const boundary = `studio-${crypto.randomUUID()}`;
        const head = new TextEncoder().encode(
          `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name, parents: [parent] })}\r\n--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`,
        );
        const tail = new TextEncoder().encode(`\r\n--${boundary}--\r\n`);
        const body = new Uint8Array(head.length + bytes.length + tail.length);
        body.set(head, 0);
        body.set(bytes, head.length);
        body.set(tail, head.length + bytes.length);
        await call(
          `${DRIVE_UPLOAD}/files?uploadType=multipart&supportsAllDrives=true`,
          { method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body: body as BodyInit },
          path,
        );
      }
      children.delete(parent);
    },
    async remove(folder, path) {
      const at = await find(folder, path);
      if (at === null || at.mimeType === FOLDER) return;
      await call(`${DRIVE_API}/files/${encodeURIComponent(at.id)}?supportsAllDrives=true`, { method: "DELETE" }, path);
      children.clear();
    },
  };

  const account: DriveAccountPort = {
    signedIn: async () => (await stored()) !== null,
    signIn: (pasted) => options.secrets.set(DRIVE_TOKEN, pasted.trim()),
    signOut: () => options.secrets.set(DRIVE_TOKEN, ""),
    async folderName(id) {
      const file = (await (await call(`${DRIVE_API}/files/${encodeURIComponent(id)}?fields=id,name,mimeType&supportsAllDrives=true`, {}, "That link")).json()) as DriveFile;
      if (file.mimeType !== FOLDER) throw new Error("That link is to a file, not a folder: copy the link of the folder.");
      return file.name;
    },
    ...(options.clientId !== undefined && options.loopback !== undefined
      ? {
          async browserSignIn(open: (url: string) => void): Promise<{ ok: true } | { ok: false; reason: string }> {
            try {
              const verifier = base64url(crypto.getRandomValues(new Uint8Array(48)));
              const challenge = base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
              const state = base64url(crypto.getRandomValues(new Uint8Array(16)));
              const { redirectUri, query } = await options.loopback!();
              const params = new URLSearchParams({
                client_id: options.clientId!,
                redirect_uri: redirectUri,
                response_type: "code",
                scope: DRIVE_SCOPE,
                code_challenge: challenge,
                code_challenge_method: "S256",
                access_type: "offline",
                prompt: "consent",
                state,
              });
              open(`${GOOGLE_AUTHORIZE}?${params}`);
              const answer = new URLSearchParams(await query);
              if (answer.get("state") !== state) return { ok: false, reason: "The answer from Google didn't match this sign-in, so Studio ignored it. Try again." };
              const code = answer.get("code");
              if (code === null) return { ok: false, reason: `Google didn't sign Studio in${answer.get("error") ? `: ${answer.get("error")}` : "."}` };
              const signed = await exchange({
                grant_type: "authorization_code",
                code,
                code_verifier: verifier,
                client_id: options.clientId!,
                redirect_uri: redirectUri,
                ...(options.clientSecret ? { client_secret: options.clientSecret } : {}),
              });
              await options.secrets.set(DRIVE_TOKEN, JSON.stringify(signed));
              return { ok: true };
            } catch (error) {
              return { ok: false, reason: error instanceof Error ? error.message : String(error) };
            }
          },
        }
      : {}),
  };

  return { library, registry, account };
}
