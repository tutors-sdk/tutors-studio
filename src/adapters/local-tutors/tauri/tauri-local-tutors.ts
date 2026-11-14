import { invoke } from "@tauri-apps/api/core";
import type { LiveStart, LocalTutorsPort } from "../../../application/ports/local-tutors.ts";
import { liveLinkFor, liveSteps, READER_ORIGIN, type TutorsFolderFacts } from "../../../domain/live-tutors.ts";

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Tutors on this computer in the app (ADR 0042), through Studio's Rust commands (src-tauri/src/live.rs): the
 * built course served on 127.0.0.1, `pnpm dev` run only in a copy of the Tutors repository, and a Tutors
 * window of Studio's own that reloads on the page it shows after each rebuild.
 */
export const tauriLocalTutors: LocalTutorsPort = {
  facts: (folder) => invoke<TutorsFolderFacts>("tutors_facts", { folder }),
  async start(folder, progress = () => {}): Promise<LiveStart> {
    progress(liveSteps.serve);
    let port: number;
    try {
      port = await invoke<number>("tutors_serve");
    } catch (error) {
      return { ok: false, reason: "Studio couldn't serve the course on this computer.", detail: reason(error) };
    }
    if (await invoke<boolean>("tutors_reader_answers")) {
      progress(liveSteps.reuse);
      return { ok: true, link: liveLinkFor(READER_ORIGIN, port), startedReader: false };
    }
    progress(liveSteps.reader);
    try {
      const origin = await invoke<string>("tutors_reader_start", { folder });
      return { ok: true, link: liveLinkFor(origin, port), startedReader: true };
    } catch (error) {
      return {
        ok: false,
        reason: "Tutors didn't start from your copy. In a terminal in that folder, run pnpm dev and check it opens; then try again, and Studio uses it.",
        detail: reason(error),
      };
    }
  },
  show: (link) => invoke("tutors_show", { link }),
  refresh: () => invoke("tutors_refresh"),
  stop: () => invoke("tutors_stop"),
};
