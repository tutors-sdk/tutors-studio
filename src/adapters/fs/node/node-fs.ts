import { watch as fsWatch } from "node:fs";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import type { DirEntry, FileSystemPort } from "../../../application/ports/file-system.ts";

/** The open course on the local disk through node:fs: the headless CLI's adapter, and how CI replays journeys. */
export class NodeFileSystem implements FileSystemPort {
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  /** Resolves a course-relative path, refusing anything that would leave the course folder. */
  private at(path: string): string {
    const full = resolve(this.root, path.replaceAll("\\", "/"));
    if (full !== this.root && !full.startsWith(this.root + sep)) throw new Error(`${path}: outside the course folder`);
    return full;
  }

  async list(dir: string): Promise<DirEntry[]> {
    const entries = await readdir(this.at(dir), { withFileTypes: true });
    return Promise.all(
      entries.map(async (entry): Promise<DirEntry> =>
        entry.isDirectory() ? { name: entry.name, kind: "dir" } : { name: entry.name, kind: "file", size: (await stat(join(this.at(dir), entry.name))).size },
      ),
    );
  }

  async read(path: string): Promise<Uint8Array> {
    return new Uint8Array(await readFile(this.at(path)));
  }

  async write(path: string, bytes: Uint8Array): Promise<void> {
    await mkdir(dirname(this.at(path)), { recursive: true });
    await writeFile(this.at(path), bytes);
  }

  async move(from: string, to: string): Promise<void> {
    if (await this.exists(to)) throw new Error(`${to}: already exists`);
    await mkdir(dirname(this.at(to)), { recursive: true });
    await rename(this.at(from), this.at(to));
  }

  async exists(path: string): Promise<boolean> {
    try {
      await stat(this.at(path));
      return true;
    } catch {
      return false;
    }
  }

  async remove(path: string): Promise<void> {
    await rm(this.at(path));
  }

  watch(onChange: () => void): () => void {
    const watcher = fsWatch(this.root, { recursive: true }, () => onChange());
    return () => watcher.close();
  }
}
