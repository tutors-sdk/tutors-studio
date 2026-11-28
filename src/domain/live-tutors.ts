/**
 * The course live in Tutors on this computer (ADR 0042): the lecturer's own copy of the Tutors repository
 * (tutors-sdk/tutors-mono-repo) runs the reader, Studio serves the built course beside it, and every change
 * shows there a moment later. Pure: what counts as a copy of Tutors, the addresses, and the words.
 */

/** The port Studio serves the built course on first, on this computer only; the next free one up to 8199 after that. */
export const COURSE_PORT = 8190;

/** The port the Tutors reader inside Studio is served on first, on this computer only; the next free one up to 8209 after (ADR 0045). */
export const INSIDE_READER_PORT = 8200;

/** The page the reader inside Studio answers with for any path that names no file: SvelteKit's static fallback. */
export const READER_FALLBACK = "200.html";

/**
 * The content security policy the reader inside Studio is served with (ADR 0045): its own scripts, a course on
 * this computer, and the pictures, videos and embeds a course links to on the web. Nothing else runs.
 */
export const READER_CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: http://127.0.0.1:* https:; font-src 'self' data: https:; connect-src 'self' http://127.0.0.1:* https:; media-src 'self' http://127.0.0.1:* https:; frame-src 'self' http://127.0.0.1:* https:; object-src 'none'; base-uri 'self'; form-action 'none'";

/** What Studio says when a copy carries no Tutors reader and the lecturer has no copy of their own (STU-0178). */
export const NO_READER =
  "This copy of Studio is missing the Tutors reader, so it can't show the course. Download Studio again from the release page and install it over this one; your courses and settings stay as they are.";

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

/** The reader's home page, where it lists the courses read in it (STU-0311). */
export const readerHomeFor = (readerOrigin: string) => `${readerOrigin.replace(/\/+$/, "")}/`;

/** True for a reader's home page on this computer, which Studio may also show in its Tutors window (STU-0311). */
export const isReaderHome = (link: string) => /^http:\/\/(localhost|127\.0\.0\.1):\d{1,5}\/?$/.test(link);

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
  inside: "Opening the Tutors inside Studio",
  open: "Opening the course in Tutors",
} as const;

/** What the Tutors window says while Studio rebuilds the course, and when a change didn't build (STU-0169). */
export const tutorsNotes = {
  updating: "Studio is updating this course…",
  failed: "This change didn't build. You're seeing the last version: Studio says why.",
} as const;

export type TutorsNote = keyof typeof tutorsNotes;

/** How long a rebuild took, in a lecturer's words: "in 0.3 seconds", "in 14 seconds". */
export function tookFor(ms: number): string {
  const seconds = ms / 1000;
  return seconds < 10 ? `in ${seconds.toFixed(1)} seconds` : `in ${Math.round(seconds)} seconds`;
}

/** The line at the foot of the contents while the course is live (STU-0169, STU-0170). */
export type LiveStatus = { state: "updating" } | { state: "ready"; at: string; ms: number | null } | { state: "failed" };

export function liveStatusLine(status: LiveStatus): string {
  if (status.state === "updating") return "Live in Tutors: updating…";
  if (status.state === "failed") return "Live in Tutors: the last change didn't build";
  return status.ms === null ? `Live in Tutors: up to date at ${status.at}` : `Live in Tutors: up to date at ${status.at}, rebuilt ${tookFor(status.ms)}`;
}

/**
 * Which Tutors Studio shows courses in, as Settings says it in Advanced mode (STU-0314): the lecturer's own copy
 * where they chose one, else the Tutors inside Studio with its release, else none yet. Pure.
 */
export function tutorsInUse(folder: string | null, inside: boolean, release: string): string {
  if (folder !== null) return `Your own copy of Tutors, at ${folder}`;
  if (inside) return `The Tutors inside Studio (Tutors ${release})`;
  return "None yet: this Studio carries no Tutors of its own, so choose your copy of Tutors below";
}
