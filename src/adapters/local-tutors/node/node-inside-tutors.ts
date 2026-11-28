import type { Server } from "node:http";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type { LiveStart, LocalTutorsPort } from "../../../application/ports/local-tutors.ts";
import { COURSE_PORT, INSIDE_READER_PORT, liveLinkFor, liveSteps, NO_READER, READER_CSP, READER_FALLBACK, readerHomeFor, tutorsNotes } from "../../../domain/live-tutors.ts";
import { BUILD_FOLDER } from "../../../domain/publish.ts";
import { closeServer, serveFolder } from "./serve-folder.ts";

/**
 * The Tutors reader inside Studio, for the headless CLI (ADR 0045): the reader's static files (`readerFolder`,
 * the folder `TUTORS_READER` names) served on 127.0.0.1 with their fallback page and a content security
 * policy, and the course's json/ served beside them as for the lecturer's own copy. Nothing is started.
 */
export function nodeInsideTutors(courseRoot: string, readerFolder: string | null, say: (line: string) => void = () => {}): LocalTutorsPort {
  let course: Server | null = null;
  let reader: Server | null = null;
  let ports: { course: number; reader: number } | null = null;
  /** The reader's port when it was opened for its home page alone. */
  let homePort = 0;

  return {
    facts: async () => ({ packageName: null, reader: false, installed: false }),
    async start(_folder, progress = () => {}): Promise<LiveStart> {
      if (readerFolder === null || !existsSync(join(readerFolder, READER_FALLBACK))) return { ok: false, reason: NO_READER, detail: "" };
      if (ports === null) {
        try {
          progress(liveSteps.serve);
          const served = await serveFolder(resolve(courseRoot, BUILD_FOLDER), COURSE_PORT, { cors: true });
          course = served.server;
          progress(liveSteps.inside);
          // The reader may already run for its home page (STU-0311): the course is shown in that one.
          if (reader === null) {
            const opened = await serveFolder(readerFolder, INSIDE_READER_PORT, { fallback: READER_FALLBACK, csp: READER_CSP });
            reader = opened.server;
            homePort = opened.port;
          }
          ports = { course: served.port, reader: homePort };
        } catch (error) {
          await this.stop();
          return { ok: false, reason: "Studio couldn't serve the course on this computer.", detail: (error as Error).message };
        }
      }
      return { ok: true, link: liveLinkFor(`http://127.0.0.1:${ports.reader}`, ports.course), startedReader: true };
    },
    async home(_folder, progress = () => {}) {
      if (readerFolder === null || !existsSync(join(readerFolder, READER_FALLBACK))) return { ok: false, reason: NO_READER, detail: "" };
      if (reader === null) {
        progress(liveSteps.inside);
        try {
          const opened = await serveFolder(readerFolder, INSIDE_READER_PORT, { fallback: READER_FALLBACK, csp: READER_CSP });
          reader = opened.server;
          homePort = opened.port;
        } catch (error) {
          return { ok: false, reason: "Studio couldn't open the Tutors inside it.", detail: (error as Error).message };
        }
      }
      return { ok: true, link: readerHomeFor(`http://127.0.0.1:${ports?.reader ?? homePort}`) };
    },
    async show(link) {
      say(`Open ${link}`);
    },
    async note(note) {
      say(`… ${tutorsNotes[note]}`);
    },
    async refresh() {
      say("Rebuilt: reload the page in Tutors to see it.");
    },
    async stop() {
      const running = [course, reader];
      course = reader = null;
      ports = null;
      await Promise.all(running.map(closeServer));
    },
  };
}
