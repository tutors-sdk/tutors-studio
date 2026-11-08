import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { DirEntry, FileSystemPort } from "../../../application/ports/file-system.ts";

/**
 * The open course through Studio's own Tauri commands (src-tauri/src/fs.rs). The Rust side holds the
 * course root and refuses any path outside it, so the WebView never gets general file access. Swapping
 * the shell for Electron (ADR 0001's fallback) replaces this file and nothing above it.
 */
export class TauriFileSystem implements FileSystemPort {
  list(dir: string): Promise<DirEntry[]> {
    return invoke<DirEntry[]>("fs_list", { dir });
  }

  async read(path: string): Promise<Uint8Array> {
    return new Uint8Array(await invoke<number[]>("fs_read", { path }));
  }

  write(path: string, bytes: Uint8Array): Promise<void> {
    return invoke("fs_write", { path, bytes: Array.from(bytes) });
  }

  move(from: string, to: string): Promise<void> {
    return invoke("fs_move", { from, to });
  }

  exists(path: string): Promise<boolean> {
    return invoke<boolean>("fs_exists", { path });
  }

  remove(path: string): Promise<void> {
    return invoke("fs_remove", { path });
  }

  watch(onChange: () => void): () => void {
    let unlisten: (() => void) | null = null;
    let stopped = false;
    void listen("course-changed", () => onChange()).then((stop) => {
      if (stopped) stop();
      else unlisten = stop;
    });
    return () => {
      stopped = true;
      unlisten?.();
    };
  }
}

/** Asks the Rust side to open a course folder: every later call is relative to it. */
export function openCourseRoot(root: string): Promise<void> {
  return invoke("open_course", { root });
}

/**
 * Asks the Rust side to make a new, empty course folder under `parent` and open it. The Rust side refuses
 * a folder that already exists and a name that isn't a plain folder name.
 */
export function tauriCourseFolder(parent: string): (name: string) => Promise<FileSystemPort> {
  return async (name) => {
    await invoke("create_course", { parent, name });
    return new TauriFileSystem();
  };
}
