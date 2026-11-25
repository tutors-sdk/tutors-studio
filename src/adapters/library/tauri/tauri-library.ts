import { invoke } from "@tauri-apps/api/core";
import type { DirEntry } from "../../../application/ports/file-system.ts";
import type { LibraryPort } from "../../../application/ports/library.ts";

/** Library folders through Studio's read-only Rust commands (src-tauri/src/library.rs, ADR 0061). */
export const tauriLibrary: LibraryPort = {
  list: (folder, dir) => invoke<DirEntry[]>("library_list", { root: folder, dir }),
  read: async (folder, path) => new Uint8Array(await invoke<number[]>("library_read", { root: folder, path })),
};
