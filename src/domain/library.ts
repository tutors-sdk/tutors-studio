import type { CourseFolder } from "./course-map.ts";
import type { Finding } from "./finding.ts";

/**
 * The lecturer's library (ADR 0061): folders on this computer that Studio searches for Tutors courses, so a
 * course can be put together from material they and their colleagues already have. Studio only reads them.
 */

/** How deep below a library folder Studio looks for a course. Deep enough for Documents/Teaching/2026/module. */
export const LIBRARY_DEPTH = 6;

/** Folders never searched: version control, editors, dependencies, Tutors' build output and anything hidden. */
const NEVER_SEARCHED = new Set(["node_modules", "json", "html", "_site"]);

/** Whether Studio looks inside a folder of this name for courses. Pure. */
export const searchedFolder = (name: string): boolean => !name.startsWith(".") && !NEVER_SEARCHED.has(name);

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

/** A Tutors course found in a library folder. */
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
}

/** A library folder Studio couldn't search, with why (STU-0265). */
export interface UnreadLibrary {
  library: string;
  message: string;
}

export interface Library {
  courses: LibraryCourse[];
  unread: UnreadLibrary[];
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
  if (course.group === "needs-fixing") return `Needs fixing: ${course.title} in ${where} (${count(course.errors, "problem")} to fix before its items can be used)`;
  const warnings = course.warnings === 0 ? "" : `, ${count(course.warnings, "warning")}`;
  return `Ready: ${course.title} in ${where} (${count(course.items.length, "item")}${warnings})`;
}

/** Ready courses first, then those that need fixing, each by title. Pure. */
export const libraryOrder = (courses: readonly LibraryCourse[]): LibraryCourse[] =>
  [...courses].sort((a, b) => (a.group === b.group ? a.title.localeCompare(b.title) || a.path.localeCompare(b.path) : a.group === "ready" ? -1 : 1));
