import { invoke } from "@tauri-apps/api/core";
import type { RegistryPort } from "../../../application/ports/registry.ts";

/** Folder registries through Studio's Rust commands (src-tauri/src/registry.rs, ADR 0063). */
export const tauriRegistry: RegistryPort = {
  write: (folder, path, bytes) => invoke("registry_write", { root: folder, path, bytes: Array.from(bytes) }),
  remove: (folder, path) => invoke("registry_remove", { root: folder, path }),
};
