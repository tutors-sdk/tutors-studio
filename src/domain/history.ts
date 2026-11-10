/**
 * What Studio changed in the open course, and how to put each change back (STU-0091 to STU-0094). Pure:
 * the use case records a change when a plan applies and turns its undo steps into a plan the lecturer
 * accepts like any other (ADR 0004). Undo never deletes: a file a change added goes to the bin (ADR 0032).
 */

/** Where removed things go: a folder in the course Tutors never reads, so nothing in it is published. */
export const BIN_FOLDER = ".tutors-bin";

/** How to put back one operation of an applied plan, with what it wrote so a later edit is never lost. */
export type UndoStep =
  /** A move: the folder or file is now at `now` and goes back to `was`. */
  | { kind: "move-back"; now: string; was: string }
  /** A write over a file: put its earlier content back, if the file still holds what the change wrote. */
  | { kind: "restore"; path: string; content: Uint8Array; written: Uint8Array }
  /** A write that added a file: move it to the bin, if it still holds what the change wrote. */
  | { kind: "bin"; path: string; written: Uint8Array };

export interface Change {
  id: string;
  summary: string;
  /** When it was applied, as an ISO time. */
  at: string;
  /** The steps that put it back, in the order to run them (the plan's ops reversed). */
  steps: UndoStep[];
  /** Set once the change has been put back: the id of the change that did it. */
  undoneBy?: string;
}

export const sameBytes = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((byte, i) => byte === b[i]);

/** A name for `name` in the bin that none of `taken` has: "talk-01", then "talk-01-2", keeping a file's extension. */
export function binName(name: string, taken: ReadonlySet<string>): string {
  const dot = name.lastIndexOf(".");
  const [stem, extension] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ""];
  let candidate = name;
  for (let n = 2; taken.has(candidate); n++) candidate = `${stem}-${n}${extension}`;
  return candidate;
}

/** "Put back: Add a lab ..." for the plan that undoes a change. */
export const undoSummary = (summary: string) => `Put back: ${summary.charAt(0).toLowerCase()}${summary.slice(1)}`;

/** Why a change can't be put back, in the lecturer's words. */
export const undoProblems = {
  unknown: () => "Studio has no record of that change.",
  alreadyUndone: () => "That change has already been put back.",
  changedSince: (path: string) => `${path} has changed since, so putting this back would lose that work. Change it by hand, or put back the later changes first.`,
  movedSince: (path: string) => `${path} isn't where this change left it any more, so Studio can't move it back. Put back the later changes first.`,
  occupied: (path: string) => `Something is already at ${path}, so Studio can't move it back there.`,
} as const;
