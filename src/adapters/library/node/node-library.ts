import { readdir, readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import type { DirEntry } from "../../../application/ports/file-system.ts";
import type { LibraryPort } from "../../../application/ports/library.ts";

/** A path inside a library folder, refusing anything that would leave it. */
function inside(folder: string, path: string): string {
  const root = resolve(folder);
  const full = resolve(root, path.replaceAll("\\", "/"));
  if (full !== root && !full.startsWith(root + sep)) throw new Error(`${path}: outside the library folder`);
  return full;
}

/** Library folders on the local disk through node:fs, read only: the headless CLI's adapter (ADR 0061). */
export const nodeLibrary: LibraryPort = {
  async list(folder, dir) {
    const entries = await readdir(inside(folder, dir), { withFileTypes: true });
    return entries.flatMap((entry): DirEntry[] => (entry.isDirectory() ? [{ name: entry.name, kind: "dir" }] : entry.isFile() ? [{ name: entry.name, kind: "file" }] : []));
  },
  async read(folder, path) {
    return new Uint8Array(await readFile(inside(folder, path)));
  },
};
