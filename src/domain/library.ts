import type { CourseFolder } from "./course-map.ts";
import type { Finding } from "./finding.ts";

/**
 * The lecturer's library (ADR 0061): folders on this computer that Studio searches for Tutors courses, so a
 * course can be put together from material they and their colleagues already have. Studio only reads them.
 */

/** How deep below a library folder Studio looks for a course. Deep enough for Documents/Teaching/2026/module. */
export const LIBRARY_DEPTH = 6;

/**
 * Folders never searched, besides anything hidden: they hold software, not courses (STU-0303). Dependencies,
 * Tutors' build output and other tools' build output, Python environments, and the system's own folders. A
 * course inside one of these is still found when the lecturer adds that folder itself.
 */
export const NEVER_SEARCHED: readonly string[] = [
  "node_modules",
  "json",
  "html",
  "_site",
  "target",
  "dist",
  "build",
  "obj",
  "bin",
  "out",
  "__pycache__",
  "venv",
  "site-packages",
  "Pods",
  "DerivedData",
  "AppData",
  "System Volume Information",
];
const neverSearched = new Set(NEVER_SEARCHED);

/** How names start of folders never searched: hidden ones, and the ones Windows keeps for itself ($RECYCLE.BIN). */
export const NEVER_SEARCHED_STARTS: readonly string[] = [".", "$"];

/** Whether Studio looks inside a folder of this name for courses. Pure. */
export const searchedFolder = (name: string): boolean => !NEVER_SEARCHED_STARTS.some((start) => name.startsWith(start)) && !neverSearched.has(name);

/** The files that end a search where they are: a folder registry (ADR 0063) or a course. */
export const LIBRARY_MARKERS = ["registry.json", "course.md"] as const;

/**
 * How a library search is going (STU-0301): looking through a library folder (folders opened so far, courses
 * found so far), or checking the courses it found, one after another.
 */
export type LibraryProgress =
  { stage: "looking"; library: string; looked: number; found: number } | { stage: "checking"; library: string; checking: number; of: number; course: string };

const plural = (n: number, one: string) => `${n.toLocaleString("en")} ${one}${n === 1 ? "" : "s"}`;

/** A library search's progress as one line: "Looking in Teaching: 1,204 folders so far, 3 courses found". Pure. */
export function libraryProgressLine(progress: LibraryProgress): string {
  if (progress.stage === "looking") return `Looking in ${lastPart(progress.library)}: ${plural(progress.looked, "folder")} so far, ${plural(progress.found, "course")} found`;
  return `Checking ${progress.checking} of ${progress.of}: ${progress.course}`;
}

/** What a search of one library folder found, before any course is checked: once it is done looking (STU-0301). Pure. */
export const lookedLine = (library: string, looked: number, found: number): string =>
  `Looked in ${plural(looked, "folder")} in ${lastPart(library)} and found ${plural(found, "course")}.`;

/** Ready: no error findings, so its items can go into another course. Needs fixing: at least one error. */
export type LibraryGroup = "ready" | "needs-fixing";

/** One learning object inside a library course that can be added to another course. */
export interface LibraryItem {
  /** Relative to its course's folder, "/"-separated. */
  path: string;
  kind: string;
  /** The title its card shows, or its folder's name when it has none. */
  title: string;
}

/** A stored folder of a registry entry (ADR 0063): a top-level learning object of the course, or the course's own root files (path ""). */
export interface StoredFolder {
  path: string;
  /** "sha256:<hex>" over its files, path and bytes, in path order. Its files are at items/<hex>/ in the registry. */
  digest: string;
}

/** Where a library course that came out of a folder registry is kept, and what it was shared under (ADR 0063). */
export interface RegistryEntryOf {
  /** The registry's folder, relative to the library folder ("" when the library folder is the registry). */
  registry: string;
  publisher: string;
  name: string;
  version: number;
  /** An SPDX identifier or expression. */
  licence: string;
  /** The title of the course it was shared from. */
  from: string;
  folders: StoredFolder[];
}

/** A Tutors course found in a library folder, or an entry of a folder registry in one. */
export interface LibraryCourse {
  /** The library folder it was found in, as the lecturer added it. */
  library: string;
  /** Relative to the library folder, "/"-separated; "" when the library folder is the course. */
  path: string;
  /** Its title (course.md's first line), or its folder's name. */
  title: string;
  group: LibraryGroup;
  errors: number;
  warnings: number;
  /** Every week, unit and item in it, outermost first. Empty for a course that needs fixing (STU-0263). */
  items: LibraryItem[];
  /** Set when it is an entry of a folder registry: its files are stored by digest, not as a course folder. */
  entry?: RegistryEntryOf;
}

/** A library folder Studio couldn't search, with why (STU-0265). */
export interface UnreadLibrary {
  library: string;
  message: string;
}

export interface Library {
  courses: LibraryCourse[];
  unread: UnreadLibrary[];
  /** The lecturer stopped the search before it ended: what it found up to then (STU-0305). */
  stopped?: boolean;
}

/** The group a course's findings put it in. Pure. */
export const groupOf = (findings: readonly Finding[]): LibraryGroup => (findings.some((finding) => finding.severity === "error") ? "needs-fixing" : "ready");

/** The kinds that can be taken out of one course and put in another: everything but the course itself. */
const movable = (kind: string | null): kind is string => kind !== null && kind !== "course";

/** Every learning object in a course's tree, outermost first, as the library lists them. Pure. */
export function itemsOf(tree: CourseFolder): LibraryItem[] {
  const items: LibraryItem[] = [];
  const walk = (folder: CourseFolder) => {
    for (const child of folder.children) {
      if (!movable(child.kind)) continue;
      items.push({ path: child.path, kind: child.kind, title: child.title?.trim() || child.name });
      walk(child);
    }
  };
  walk(tree);
  return items;
}

/** The last part of a path, "/" or "\\" separated. Pure. */
export const lastPart = (path: string): string => path.split(/[\\/]/).filter(Boolean).pop() ?? path;

/** A library course as one line: "Ready: Web Development 2 (12 items, 2 warnings)". Pure. */
export function libraryLine(course: LibraryCourse): string {
  const where = course.path === "" ? lastPart(course.library) : course.path;
  const count = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;
  if (course.entry)
    return `Shared: ${course.title} as ${course.entry.publisher}/${course.entry.name} version ${course.entry.version}, ${course.entry.licence} (${count(course.items.length, "item")})`;
  if (course.group === "needs-fixing") return `Needs fixing: ${course.title} in ${where} (${count(course.errors, "problem")} to fix before its items can be used)`;
  const warnings = course.warnings === 0 ? "" : `, ${count(course.warnings, "warning")}`;
  return `Ready: ${course.title} in ${where} (${count(course.items.length, "item")}${warnings})`;
}

/** Ready courses first, then those that need fixing, each by title. Pure. */
export const libraryOrder = (courses: readonly LibraryCourse[]): LibraryCourse[] =>
  [...courses].sort((a, b) => (a.group === b.group ? a.title.localeCompare(b.title) || a.path.localeCompare(b.path) : a.group === "ready" ? -1 : 1));
