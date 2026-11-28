import { invoke } from "@tauri-apps/api/core";
import type { LiveStart, LocalTutorsPort } from "../../../application/ports/local-tutors.ts";
import { liveLinkFor, liveSteps, NO_READER, readerHomeFor } from "../../../domain/live-tutors.ts";
import { tauriLocalTutors } from "./tauri-local-tutors.ts";

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Whether this copy of Studio carries the Tutors reader (the Windows installer does, ADR 0045). */
export const carriesReader = () => invoke<boolean>("tutors_inside_present");

/**
 * The Tutors reader inside Studio, in the app (ADR 0045): the reader's static files that the installer carries,
 * served by Studio's Rust side (src-tauri/src/live.rs) on 127.0.0.1 with their fallback page and a content
 * security policy, beside the built course. The course shows in the same Tutors window as for the lecturer's
 * own copy, which reloads after each rebuild.
 */
export const tauriInsideTutors: LocalTutorsPort = {
  facts: async () => ({ packageName: null, reader: false, installed: false }),
  async start(_folder, progress = () => {}): Promise<LiveStart> {
    if (!(await carriesReader())) return { ok: false, reason: NO_READER, detail: "" };
    progress(liveSteps.serve);
    let port: number;
    try {
      port = await invoke<number>("tutors_serve");
    } catch (error) {
      return { ok: false, reason: "Studio couldn't serve the course on this computer.", detail: reason(error) };
    }
    progress(liveSteps.inside);
    try {
      const origin = await invoke<string>("tutors_inside_start");
      return { ok: true, link: liveLinkFor(origin, port), startedReader: true };
    } catch (error) {
      return { ok: false, reason: "Studio couldn't open the Tutors inside it.", detail: reason(error) };
    }
  },
  async home(_folder, progress = () => {}) {
    if (!(await carriesReader())) return { ok: false, reason: NO_READER, detail: "" };
    progress(liveSteps.inside);
    try {
      return { ok: true, link: readerHomeFor(await invoke<string>("tutors_inside_start")) };
    } catch (error) {
      return { ok: false, reason: "Studio couldn't open the Tutors inside it.", detail: reason(error) };
    }
  },
  show: tauriLocalTutors.show,
  refresh: tauriLocalTutors.refresh,
  note: tauriLocalTutors.note,
  stop: tauriLocalTutors.stop,
};
