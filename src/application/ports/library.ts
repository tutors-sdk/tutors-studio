import type { DirEntry } from "./file-system.ts";

/**
 * Driven port: the lecturer's library folders (ADR 0061), which Studio searches for Tutors courses and only
 * reads. Each call names the folder it reads in; paths are "/"-separated and relative to it ("" is the folder).
 */
export interface LibraryPort {
  list(folder: string, dir: string): Promise<DirEntry[]>;
  read(folder: string, path: string): Promise<Uint8Array>;
}
