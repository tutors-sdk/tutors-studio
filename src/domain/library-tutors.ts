/**
 * The library inside Tutors (ADR 0068): the ready courses in the lecturer's library folders, each built from a
 * copy in Studio's own folder and served on this computer, listed on the Tutors reader's home page beside the
 * courses the lecturer has read there. Pure: which courses go, their entries on that page, and the words.
 */
import { isDriveFolder } from "./drive.ts";
import { lastPart, type LibraryCourse } from "./library.ts";

/** The first port a library course is served on, on this computer only; the next free one up to 8399 after. */
export const LIBRARY_PORT = 8300;
/** How many ports from LIBRARY_PORT library courses may take: a hundred courses at once. */
export const LIBRARY_PORTS = 100;

/**
 * A course's entry on the reader's home page, in the shape the reader keeps them (its `courseVisits` in the
 * browser's storage, @tutors/connect). The reader reads the course at `id` when the lecturer opens it.
 */
export interface LibraryVisit {
  /** "127.0.0.1:<port>": where Studio serves the course's build. */
  id: string;
  title: string;
  /** The line under the title: where the course is in the library. */
  credits: string;
}

/** Ready courses kept as folders on this computer: the ones Studio can build. Registry entries and Drive folders are not. Pure. */
export const showable = (course: LibraryCourse): boolean => course.group === "ready" && !course.entry && !isDriveFolder(course.library);

/** A library course's folder on this computer. Pure. */
export const courseFolderOf = (course: LibraryCourse): string => (course.path === "" ? course.library : `${course.library}/${course.path}`);

/** A served library course's entry on the reader's home page. Pure. */
export const libraryVisitFor = (course: LibraryCourse, port: number): LibraryVisit => ({
  id: `127.0.0.1:${port}`,
  title: course.title,
  credits: `In your library: ${course.path === "" ? lastPart(course.library) : `${lastPart(course.library)}/${course.path}`}`,
});

/** An entry the reader keeps on its home page; Studio reads only these fields and keeps the rest as they are. */
export type ReaderVisit = { id: string; title?: string; [field: string]: unknown };

/**
 * The reader's home page list after Studio lists the library (STU-0316, STU-0320): the courses Studio listed
 * before (`before`, by id) that it no longer serves come off; each library course is added, or retitled where
 * it is listed already; every other course stays as it was. `ids` is what Studio has listed now. Pure: the
 * script Studio's Rust side runs in the Tutors window does the same (src-tauri/src/library_tutors.rs).
 */
export function mergeLibraryVisits(
  visits: readonly ReaderVisit[],
  library: readonly LibraryVisit[],
  before: readonly string[],
  now: string,
): { visits: ReaderVisit[]; ids: string[] } {
  const ids = library.map((course) => course.id);
  const kept = visits.filter((visit) => !(before.includes(visit.id) && !ids.includes(visit.id))).map((visit) => ({ ...visit }));
  for (const course of library) {
    const listed = kept.find((visit) => visit.id === course.id);
    if (listed) {
      listed.title = course.title;
      listed.credits = course.credits;
    } else kept.push({ id: course.id, title: course.title, credits: course.credits, lastVisit: now, visits: 0 });
  }
  return { visits: kept, ids };
}

/** How showing the library in Tutors is going (STU-0318). */
export type LibraryTutorsProgress = { stage: "building"; building: number; of: number; course: string } | { stage: "opening" };

/** The progress as one line: "Building 2 of 5: Web Development". Pure. */
export const libraryTutorsLine = (progress: LibraryTutorsProgress): string =>
  progress.stage === "building" ? `Building ${progress.building} of ${progress.of}: ${progress.course}` : "Opening Tutors with your library";

/** A library course that didn't build, named, with why (STU-0319). */
export interface UnbuiltCourse {
  title: string;
  reason: string;
}

/** What showing the library said: how many courses Tutors lists, and the ones that didn't build. Pure. */
export function libraryShownLine(shown: number, unbuilt: number, stopped: boolean): string {
  const courses = `${shown} ${shown === 1 ? "course" : "courses"}`;
  const head = stopped ? `You stopped Studio building your library. Tutors lists the ${courses} built before then.` : `Tutors lists ${courses} from your library.`;
  return unbuilt === 0 ? head : `${head} ${unbuilt} didn't build: each is named below.`;
}

/** Said when the library holds no course Studio can build. */
export const NOTHING_TO_SHOW =
  "There's no ready course in your library folders on this computer to show in Tutors yet. Courses that need fixing, and ones in a registry or on Google Drive, aren't shown.";
