import { invoke } from "@tauri-apps/api/core";
import type { LibraryTutorsPort } from "../../../application/ports/library-tutors.ts";

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Library courses in Tutors, in the app (ADR 0068): copied, built and served by Studio's Rust side
 * (src-tauri/src/library_tutors.rs), and listed on the reader's home page in Studio's Tutors window.
 */
export const tauriLibraryTutors: LibraryTutorsPort = {
  async serve(folder) {
    try {
      return { ok: true, port: await invoke<number>("library_tutors_serve", { folder }) };
    } catch (error) {
      const [first, ...rest] = reason(error).split("\n");
      return { ok: false, reason: first, detail: rest.join("\n") };
    }
  },
  list: (link, visits) => invoke("library_tutors_list", { link, visits }),
  stop: () => invoke("library_tutors_stop"),
};
