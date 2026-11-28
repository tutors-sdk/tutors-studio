import { courseFolderOf, libraryVisitFor, NOTHING_TO_SHOW, showable, type LibraryTutorsProgress, type LibraryVisit, type UnbuiltCourse } from "../../domain/library-tutors.ts";
import type { LibraryCourse } from "../../domain/library.ts";
import type { LibraryTutorsPort } from "../ports/library-tutors.ts";
import type { LiveTutorsPort } from "../ports/live-tutors.ts";
import type { Failure } from "../ports/publishing.ts";

export interface LibraryTutorsDeps {
  library: LibraryTutorsPort;
  /** The Tutors the lecturer views on this computer: its home page lists the library. */
  tutors: LiveTutorsPort;
}

/** Hears showing the library as it goes (STU-0318) and may stop the building. */
export interface LibraryTutorsWatch {
  progress?: (progress: LibraryTutorsProgress) => void;
  stopped?: () => boolean;
}

/** Tutors' home page link, how many library courses it lists, the ones that didn't build, and whether the lecturer stopped it. */
export type LibraryShown = { ok: true; link: string; shown: number; unbuilt: UnbuiltCourse[]; stopped: boolean } | Failure;

/**
 * Shows the lecturer's library in Tutors (STU-0316..STU-0320): builds each ready course kept in a library
 * folder on this computer from a copy of its own and serves it, then opens Tutors' home page and lists them
 * there. A course that doesn't build is named with why, and the others still go (STU-0319). Stopping keeps
 * the courses built so far.
 */
export async function showLibraryInTutors(deps: LibraryTutorsDeps, courses: readonly LibraryCourse[], watch: LibraryTutorsWatch = {}): Promise<LibraryShown> {
  const chosen = courses.filter(showable);
  if (chosen.length === 0) return { ok: false, reason: NOTHING_TO_SHOW, detail: "" };
  const visits: LibraryVisit[] = [];
  const unbuilt: UnbuiltCourse[] = [];
  let stopped = false;
  await deps.library.stop();
  for (const [at, course] of chosen.entries()) {
    if (watch.stopped?.()) {
      stopped = true;
      break;
    }
    watch.progress?.({ stage: "building", building: at + 1, of: chosen.length, course: course.title });
    const served = await deps.library.serve(courseFolderOf(course)).catch((error: unknown): Failure => ({ ok: false, reason: String(error), detail: "" }));
    if (served.ok) visits.push(libraryVisitFor(course, served.port));
    else unbuilt.push({ title: course.title, reason: served.detail === "" ? served.reason : `${served.reason}\n${served.detail}` });
  }
  watch.progress?.({ stage: "opening" });
  const opened = await deps.tutors.home();
  if (!opened.ok) return opened;
  await deps.library.list(opened.link, visits);
  return { ok: true, link: opened.link, shown: visits.length, unbuilt, stopped };
}
