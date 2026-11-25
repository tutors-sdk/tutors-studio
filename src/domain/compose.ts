import type { LibraryCourse, LibraryItem } from "./library.ts";

/**
 * Composing a course from the library (ADR 0062): the lecturer picks weeks and items from courses that are
 * ready, puts each in a week of a new course, and Studio copies them in. Always a copy: the new course owns
 * what it borrowed, and the original is never linked or changed (Leigh, 2026-11-25).
 */

/** What can be picked: a whole week, or one item. Units and side units are containers: pick their weeks or items. */
export const PICKABLE = new Set([
  "topic",
  "talk",
  "paneltalk",
  "note",
  "panelnote",
  "lab",
  "web",
  "github",
  "archive",
  "video",
  "panelvideo",
  "podcast",
  "tutorial",
  "notebook",
  "whiteboard",
  "quiz",
]);

export const pickable = (item: LibraryItem): boolean => PICKABLE.has(item.kind);

/** One thing the lecturer picked, and where it goes: a week of the new course (1, 2 ...), or 0 for the module's own unit. */
export interface ComposePick {
  course: Pick<LibraryCourse, "library" | "path" | "title">;
  item: LibraryItem;
  week: number;
}

/** The sentence every compose plan carries, so the lecturer knows what they are getting (STU-0267). */
export const COPY_NOTICE =
  "Studio copies each item into your new course. Your course gets its own copy: changing it won't change the original, and later changes to the original won't reach your course.";

/** Where Studio records what each copied item came from; a dot folder, so Tutors never publishes it. */
export const SOURCES_FILE = ".tutors/sources.json";

/** One copied item's record in the sources file (STU-0268). */
export interface Source {
  /** The library folder, the course in it and the item's path in that course. */
  library: string;
  course: string;
  path: string;
  /** The title of the course it came from, for the credits page. */
  from: string;
  title: string;
  /** SHA-256 of the item's files as copied, so Studio can later tell whether either side changed. */
  digest: string;
  /** The day it was copied (YYYY-MM-DD). */
  copied: string;
}

/**
 * The folder name a copied item takes beside the names already there: its kind and the next free number,
 * keeping the rest of its old name ("lab-01-arrays" becomes "lab-03-arrays" beside lab-01 and lab-02). Pure.
 */
export function copiedName(kind: string, original: string, taken: readonly string[]): string {
  const numbered = new RegExp(`^${kind}-(\\d+)`);
  const used = taken.flatMap((name) => {
    const match = numbered.exec(name);
    return match ? [Number(match[1])] : [];
  });
  const next = String(Math.max(0, ...used) + 1).padStart(2, "0");
  const rest = original.replace(/^[a-z]+(-?\d+)?/i, "").toLowerCase();
  return `${kind}-${next}${rest}`;
}

/** The credits page: every borrowed item, where it came from and when. Rebuilt whole from the sources file. Pure. */
export function creditsPage(sources: Record<string, Source>): string {
  const rows = Object.entries(sources)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, source]) => `| ${cell(source.title)} | ${cell(source.from)} | ${source.copied} |`);
  return [
    "# Borrowed material",
    "",
    "Some of this course was copied from other Tutors courses. Each item below is a copy; the original is unchanged.",
    "",
    "| Item | Copied from | On |",
    "| ---- | ----------- | -- |",
    ...rows,
    "",
  ].join("\n");
}

const cell = (text: string) => text.replaceAll("|", "\\|").replaceAll("\n", " ");

/** The weeks a set of picks needs at least. Pure. */
export const weeksNeeded = (picks: readonly ComposePick[]): number => Math.max(1, ...picks.map((pick) => pick.week));

/** "4 items copied from 2 courses". Pure. */
export function borrowedWords(picks: readonly ComposePick[]): string {
  const courses = new Set(picks.map((pick) => `${pick.course.library}\n${pick.course.path}`)).size;
  return `${picks.length} item${picks.length === 1 ? "" : "s"} copied from ${courses} course${courses === 1 ? "" : "s"}`;
}
