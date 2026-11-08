/**
 * A lecturer's own material, dropped on a topic or on the course: what course-rules' shape-from-content
 * makes of each file, and where Studio puts it. Pure types and names; the rules adapter shapes, the
 * authoring use case plans.
 */

/** A dropped file, relative to what was dropped ("Week 3/Lecture.pdf"), with its bytes. */
export interface DroppedFile {
  path: string;
  bytes: Uint8Array;
}

/** One learning object made from dropped files. Paths in `writes` and `copies[].to` are relative to the object's own folder. */
export interface MaterialItem {
  kind: "talk" | "note" | "lab" | "archive" | "web";
  title: string;
  /** The week its name (or its folder's name) gives, or null. */
  week: number | null;
  /** Files written fresh, such as the talk.md that titles a PDF. */
  writes: { path: string; content: string }[];
  /** Dropped files copied in: `from` is the dropped path. */
  copies: { from: string; to: string }[];
}

/** Why a dropped file isn't placed: its kind is unknown, its week is unknown (dropped on the course), or the course has no topic for its week. */
export type TrayReason = "unknown-kind" | "no-week" | "no-topic";

export interface TrayFile {
  path: string;
  reason: TrayReason;
  /** For "no-topic", the week it names. */
  week?: number;
}

/** What a drop becomes: the items, and the tray of files left for the lecturer. */
export interface MaterialShape {
  items: MaterialItem[];
  tray: TrayFile[];
}

/** What the lecturer reads about a file in the tray. Studio's own words: this is about a drop, not a rule. */
export function trayReason(file: TrayFile): string {
  switch (file.reason) {
    case "unknown-kind":
      return "Studio can't tell what kind of material this is. Tutors shows PDFs as talks, Markdown and Word files as notes, zips as downloads and link files as web links.";
    case "no-week":
      return "Nothing in its name says which week it is for. Drop it on its week's topic in the course map.";
    case "no-topic":
      return `Its name says week ${file.week}, but the course has no topic for that week yet.`;
  }
}

/** The next free folder for an item of a kind among names already in the folder: talk-01, talk-02, ... */
export function nextItemFolder(kind: string, taken: readonly string[]): string {
  let n = 1;
  const pad = (k: number) => String(k).padStart(2, "0");
  while (taken.some((name) => name === `${kind}-${pad(n)}` || name.startsWith(`${kind}-${pad(n)}-`))) n++;
  return `${kind}-${pad(n)}`;
}
