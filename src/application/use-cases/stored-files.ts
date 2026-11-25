import type { LibraryPort } from "../ports/library.ts";

export interface StoredFile {
  path: string;
  bytes: Uint8Array;
}

const joined = (dir: string, name: string) => (dir === "" ? name : `${dir}/${name}`);

/**
 * Every file under a folder in a library folder, by its path inside that folder, in path order. Hidden files and
 * folders stay behind, and so does anything `skip` names (by its path inside the folder).
 */
export async function folderFiles(library: LibraryPort, folder: string, root: string, skip: (path: string) => boolean = () => false): Promise<StoredFile[]> {
  const found: StoredFile[] = [];
  const walk = async (dir: string) => {
    for (const entry of await library.list(folder, joined(root, dir))) {
      const path = joined(dir, entry.name);
      if (entry.name.startsWith(".") || skip(path)) continue;
      if (entry.kind === "dir") await walk(path);
      else found.push({ path, bytes: await library.read(folder, joined(root, path)) });
    }
  };
  await walk("");
  return found.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

/** SHA-256 over files, path and bytes, in path order: the same files give the same digest anywhere. */
export async function digestOf(files: readonly StoredFile[]): Promise<string> {
  const encoder = new TextEncoder();
  const ordered = [...files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const parts = ordered.flatMap((file) => [encoder.encode(`${file.path}\n${file.bytes.length}\n`), file.bytes]);
  const whole = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    whole.set(part, at);
    at += part.length;
  }
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", whole as BufferSource));
  return `sha256:${[...hash].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}
