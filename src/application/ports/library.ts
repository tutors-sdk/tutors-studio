import type { DirEntry } from "./file-system.ts";

/** How far below a library folder to look, which folder names to pass over, and which files end the search where they are. */
export interface LibraryLook {
  depth: number;
  /** Folder names never opened. */
  skip: readonly string[];
  /** Folder names never opened when they start with one of these (hidden folders, Windows' own). */
  skipStarts: readonly string[];
  markers: readonly string[];
}

/** The folders a look found, relative to the library folder, by the marker file each holds. */
export interface LibraryFound {
  /** Each folder holding a marker, with the marker it holds (the first of `markers` it holds). */
  found: { dir: string; marker: string }[];
  /** How many folders were opened. */
  looked: number;
}

/**
 * Driven port: the lecturer's library folders (ADR 0061), which Studio searches for Tutors courses and only
 * reads. Each call names the folder it reads in; paths are "/"-separated and relative to it ("" is the folder).
 */
export interface LibraryPort {
  list(folder: string, dir: string): Promise<DirEntry[]>;
  read(folder: string, path: string): Promise<Uint8Array>;
  /**
   * Looks through a library folder in one go, where the adapter can do that faster than a list per folder
   * (ADR 0065): never inside a folder holding a marker, one `skip` or `skipStarts` names, or one it can't open,
   * and never through a link. `heard` hears the folders opened and markers found so far, now and then,
   * and `stopped` is asked as it goes. Absent, Studio lists each folder itself.
   */
  find?(folder: string, look: LibraryLook, heard: (looked: number, found: number) => void, stopped: () => boolean): Promise<LibraryFound>;
}
