import type { Server } from "node:http";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type { LiveStart, LocalTutorsPort } from "../../../application/ports/local-tutors.ts";
import { COURSE_PORT, INSIDE_READER_PORT, liveLinkFor, liveSteps, NO_READER, READER_CSP, READER_FALLBACK, tutorsNotes } from "../../../domain/live-tutors.ts";
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
          const opened = await serveFolder(readerFolder, INSIDE_READER_PORT, { fallback: READER_FALLBACK, csp: READER_CSP });
          reader = opened.server;
          ports = { course: served.port, reader: opened.port };
        } catch (error) {
          await this.stop();
          return { ok: false, reason: "Studio couldn't serve the course on this computer.", detail: (error as Error).message };
        }
      }
      return { ok: true, link: liveLinkFor(`http://127.0.0.1:${ports.reader}`, ports.course), startedReader: true };
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
