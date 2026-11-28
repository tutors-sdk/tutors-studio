import { Channel, invoke } from "@tauri-apps/api/core";
import type { DirEntry } from "../../../application/ports/file-system.ts";
import type { LibraryFound, LibraryPort } from "../../../application/ports/library.ts";

/**
 * Library folders through Studio's read-only Rust commands (src-tauri/src/library.rs, ADRs 0061, 0065). A
 * folder is looked through in one call off the main thread, which tells Studio how far it has got as it goes,
 * and a file comes back as its bytes.
 */
export const tauriLibrary: LibraryPort = {
  list: (folder, dir) => invoke<DirEntry[]>("library_list", { root: folder, dir }),
  read: async (folder, path) => new Uint8Array(await invoke<ArrayBuffer>("library_read", { root: folder, path })),
  async find(folder, look, heard, stopped) {
    // The Rust side can't ask the page, so the page tells it once the lecturer stops.
    let told = false;
    const tell = () => {
      if (told || !stopped()) return;
      told = true;
      void invoke("library_stop");
    };
    const channel = new Channel<{ looked: number; found: number }>();
    channel.onmessage = (progress) => {
      heard(progress.looked, progress.found);
      tell();
    };
    const timer = setInterval(tell, 250);
    try {
      return await invoke<LibraryFound>("library_find", { root: folder, look, heard: channel });
    } finally {
      clearInterval(timer);
    }
  },
};
