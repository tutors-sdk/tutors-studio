import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import type { Server } from "node:http";
import { basename, join, resolve } from "node:path";
import { createHash } from "node:crypto";
import type { LibraryTutorsPort } from "../../../application/ports/library-tutors.ts";
import type { BuildOutcome } from "../../../application/ports/course-build.ts";
import { LIBRARY_PORT, LIBRARY_PORTS, mergeLibraryVisits, type LibraryVisit, type ReaderVisit } from "../../../domain/library-tutors.ts";
import { BUILD_FOLDER } from "../../../domain/publish.ts";
import { closeServer, serveFolder } from "./serve-folder.ts";

/** Folders never copied, as NOT_COPIED in src-tauri/src/library_tutors.rs: build output, dependencies and anything hidden. */
const NOT_COPIED = new Set(["json", "html", "node_modules", "_site"]);

/**
 * Library courses in Tutors for the headless CLI and the scenarios (ADR 0068): each course copied into
 * `cache`/library-builds, built there by `build` (the Tutors generator, given the copy's folder), and its
 * build served on 127.0.0.1. With no Tutors window, `home` holds the reader's home page list as the Tauri
 * side leaves it in the window's storage.
 */
export function nodeLibraryTutors(cache: string, build: (folder: string) => Promise<BuildOutcome>): LibraryTutorsPort & { home: ReaderVisit[] } {
  const served = new Map<string, Server>();
  let before: string[] = [];
  const port: LibraryTutorsPort & { home: ReaderVisit[] } = {
    home: [],
    async serve(folder) {
      const course = resolve(folder);
      if (!existsSync(join(course, "course.md"))) return { ok: false, reason: `${folder} isn't a Tutors course: it has no course.md.`, detail: "" };
      const copy = join(cache, "library-builds", createHash("sha256").update(course).digest("hex").slice(0, 16));
      rmSync(copy, { recursive: true, force: true });
      mkdirSync(copy, { recursive: true });
      cpSync(course, copy, { recursive: true, filter: (from) => from === course || !(basename(from).startsWith(".") || NOT_COPIED.has(basename(from))) });
      const built = await build(copy);
      if (!built.ok) return built;
      await closeServer(served.get(course) ?? null);
      const { server, port } = await serveFolder(join(copy, BUILD_FOLDER), LIBRARY_PORT, { cors: true }, LIBRARY_PORTS);
      served.set(course, server);
      return { ok: true, port };
    },
    async list(_link, courses: LibraryVisit[]) {
      const merged = mergeLibraryVisits(port.home, courses, before, new Date().toISOString());
      port.home = merged.visits;
      before = merged.ids;
    },
    async stop() {
      await Promise.all([...served.values()].map(closeServer));
      served.clear();
    },
  };
  return port;
}
