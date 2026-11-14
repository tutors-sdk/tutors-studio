/**
 * The course live in Tutors on this computer (ADR 0042): the lecturer's own copy of the Tutors repository
 * (tutors-sdk/tutors-mono-repo) runs the reader, Studio serves the built course beside it, and every change
 * shows there a moment later. Pure: what counts as a copy of Tutors, the addresses, and the words.
 */

/** The port Studio serves the built course on first, on this computer only; the next free one up to 8199 after that. */
export const COURSE_PORT = 8190;

/** Where the reader answers when its developer server starts on its usual port (`pnpm dev`, Vite). */
export const READER_ORIGIN = "http://localhost:5173";

/** The package name of the Tutors repository's root, which `pnpm dev` there starts the reader from. */
export const TUTORS_PACKAGE = "tutors-mono-repo";

/** What the reader's /healthz answers with, so Studio knows the server on the reader's port is Tutors. */
export const READER_APP = "tutors-reader";

/** The variable that runs the reader with no sign-in, presence or analytics: nothing it needs beyond this computer. */
export const ANON_MODE = { PUBLIC_ANON_MODE: "TRUE" } as const;

/** What Studio can see in the folder the lecturer chose as their copy of Tutors. */
export interface TutorsFolderFacts {
  /** The `name` in its package.json; null when it has none or it can't be read. */
  packageName: string | null;
  /** Whether it holds apps/reader. */
  reader: boolean;
  /** Whether its dependencies are installed (node_modules beside package.json). */
  installed: boolean;
}

/** Why a folder can't run the reader, in a lecturer's words, or null when it can (STU-0164). */
export function tutorsFolderProblem(facts: TutorsFolderFacts): string | null {
  if (facts.packageName !== TUTORS_PACKAGE || !facts.reader)
    return "This folder isn't a copy of Tutors. Choose the folder you cloned tutors-sdk/tutors-mono-repo into: it holds apps/reader.";
  if (!facts.installed) return "Tutors isn't set up in this folder yet. Open a terminal in it, run pnpm install, then choose it again.";
  return null;
}

/** The course in the reader: the reader's own course page, reading the course Studio serves on `coursePort`. */
export const liveLinkFor = (readerOrigin: string, coursePort: number) => `${readerOrigin.replace(/\/+$/, "")}/course/127.0.0.1:${coursePort}`;

/** True for a link Studio may show in its Tutors window: a reader on this computer, reading a course on this computer. */
export const isLiveLink = (link: string) => /^http:\/\/(localhost|127\.0\.0\.1):\d{1,5}\/course\/127\.0\.0\.1:\d{1,5}$/.test(link);

// Built from a string so the escape character isn't written into the source as a control character.
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");

/** The address the reader's developer server says it answers on ("Local:   http://localhost:5174/"), or null. */
export function readerOriginIn(line: string): string | null {
  const found = /Local:\s+(http:\/\/(?:localhost|127\.0\.0\.1):\d{1,5})\/?/.exec(line.replace(ANSI, ""));
  return found ? found[1] : null;
}

/** What a reader-start that failed printed last, kept short enough to show. */
export const lastLinesOf = (text: string, count = 12) => text.trim().split("\n").slice(-count).join("\n");

/** The steps a lecturer sees while the course goes live. */
export const liveSteps = {
  build: "Building the course with the Tutors generator",
  serve: "Serving it on this computer",
  reader: "Starting Tutors from your copy (the first time takes a minute or two)",
  reuse: "Tutors is already running: using it",
  open: "Opening the course in Tutors",
} as const;
