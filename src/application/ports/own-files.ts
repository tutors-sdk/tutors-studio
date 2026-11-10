import type { DirEntry } from "./file-system.ts";

/**
 * Driven port: a folder of the lecturer's own material beside the course (feature 5, ADR 0035), which
 * Studio only reads. Paths are "/"-separated and relative to the folder ("" is the folder itself).
 */
export interface OwnFilesPort {
  /** Opens a folder the lecturer chose; later calls read inside it. */
  open(folder: string): Promise<void>;
  list(dir: string): Promise<DirEntry[]>;
  read(path: string): Promise<Uint8Array>;
}
