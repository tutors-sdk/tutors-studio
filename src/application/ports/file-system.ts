/** Driven port: the lecturer's files. Tauri commands in the app, memory in tests, node:fs for the headless CLI. */
export interface DirEntry {
  name: string;
  kind: "file" | "dir";
  size?: number;
}

export interface FileSystemPort {
  /** Paths are "/"-separated and relative to the open course's root ("" is the root). */
  list(dir: string): Promise<DirEntry[]>;
  read(path: string): Promise<Uint8Array>;
  /** Creates parent folders as needed. */
  write(path: string, bytes: Uint8Array): Promise<void>;
  /** Moves a file or a folder; fails if the target exists. Creates the target's parent folders. */
  move(from: string, to: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  /** Removes a file; used only to roll back a write the same plan made. */
  remove(path: string): Promise<void>;
  /** Calls back when anything under the root changes; returns the unsubscribe. */
  watch(onChange: () => void): () => void;
}
