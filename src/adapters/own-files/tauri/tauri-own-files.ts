import { invoke } from "@tauri-apps/api/core";
import type { DirEntry } from "../../../application/ports/file-system.ts";
import type { OwnFilesPort } from "../../../application/ports/own-files.ts";

/** The lecturer's own folder through Studio's read-only Rust commands (src-tauri/src/own.rs, ADR 0035). */
export const tauriOwnFiles: OwnFilesPort = {
  open: (folder) => invoke("own_open", { root: folder }),
  list: (dir) => invoke<DirEntry[]>("own_list", { dir }),
  read: async (path) => new Uint8Array(await invoke<number[]>("own_read", { path })),
};
