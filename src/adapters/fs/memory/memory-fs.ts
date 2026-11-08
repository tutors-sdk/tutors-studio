import type { DirEntry, FileSystemPort } from "../../../application/ports/file-system.ts";

const normalise = (path: string) =>
  path
    .replaceAll("\\", "/")
    .replace(/^\.?\/+/, "")
    .replace(/\/+$/, "");

/** A course held in memory. The contract suite runs against it, and so does every use-case test. */
export class MemoryFileSystem implements FileSystemPort {
  private readonly files = new Map<string, Uint8Array>();
  private readonly listeners = new Set<() => void>();
  /** Paths whose next write or move fails: how a test makes a plan fail part-way. */
  readonly failOn = new Set<string>();

  constructor(files: Record<string, string | Uint8Array> = {}) {
    for (const [path, content] of Object.entries(files)) this.files.set(normalise(path), typeof content === "string" ? new TextEncoder().encode(content) : content);
  }

  async list(dir: string): Promise<DirEntry[]> {
    const prefix = normalise(dir) === "" ? "" : `${normalise(dir)}/`;
    const entries = new Map<string, DirEntry>();
    for (const [path, bytes] of this.files) {
      if (!path.startsWith(prefix)) continue;
      const rest = path.slice(prefix.length);
      const slash = rest.indexOf("/");
      if (slash === -1) entries.set(rest, { name: rest, kind: "file", size: bytes.length });
      else entries.set(rest.slice(0, slash), { name: rest.slice(0, slash), kind: "dir" });
    }
    return [...entries.values()];
  }

  async read(path: string): Promise<Uint8Array> {
    const bytes = this.files.get(normalise(path));
    if (!bytes) throw new Error(`${path}: no such file`);
    return bytes;
  }

  async write(path: string, bytes: Uint8Array): Promise<void> {
    if (this.failOn.has(normalise(path))) throw new Error(`${path}: permission denied`);
    this.files.set(normalise(path), bytes);
    this.changed();
  }

  async move(from: string, to: string): Promise<void> {
    const source = normalise(from);
    const target = normalise(to);
    if (this.failOn.has(source) || this.failOn.has(target)) throw new Error(`${from}: permission denied`);
    if (await this.exists(target)) throw new Error(`${to}: already exists`);
    const moved = [...this.files].filter(([path]) => path === source || path.startsWith(`${source}/`));
    if (moved.length === 0) throw new Error(`${from}: no such file or folder`);
    for (const [path, bytes] of moved) {
      this.files.delete(path);
      this.files.set(target + path.slice(source.length), bytes);
    }
    this.changed();
  }

  async exists(path: string): Promise<boolean> {
    const target = normalise(path);
    if (target === "") return true;
    return this.files.has(target) || [...this.files.keys()].some((key) => key.startsWith(`${target}/`));
  }

  async remove(path: string): Promise<void> {
    if (!this.files.delete(normalise(path))) throw new Error(`${path}: no such file`);
    this.changed();
  }

  watch(onChange: () => void): () => void {
    this.listeners.add(onChange);
    return () => this.listeners.delete(onChange);
  }

  /** Every file and its text, sorted: what a test compares before and after. */
  snapshot(): Record<string, string> {
    return Object.fromEntries([...this.files].sort(([a], [b]) => (a < b ? -1 : 1)).map(([path, bytes]) => [path, new TextDecoder().decode(bytes)]));
  }

  private changed(): void {
    this.listeners.forEach((listener) => listener());
  }
}
