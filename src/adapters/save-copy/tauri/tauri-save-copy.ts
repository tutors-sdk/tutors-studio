import { invoke } from "@tauri-apps/api/core";
import type { SaveCopyOutcome, SaveCopyPort } from "../../../application/ports/save-copy.ts";

/** SaveCopyPort through Studio's Rust `save_copy`, which reads only inside the open course and never overwrites (ADR 0029). */
export const tauriSaveCopy: SaveCopyPort = {
  async saveCopy(from, parent, name): Promise<SaveCopyOutcome> {
    try {
      return { ok: true, folder: await invoke<string>("save_copy", { from, parent, name }) };
    } catch (error) {
      return { ok: false, reason: `The website couldn't be saved in ${parent}.`, detail: String(error) };
    }
  },
};
