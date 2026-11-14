import type { Failure } from "./publishing.ts";

/** After a change: the course rebuilt and Tutors refreshed, or the build's failure while Tutors keeps the last build. */
export type LiveUpdate = { ok: true } | Failure;

/**
 * Driving port: the course live in Tutors on this computer (ADR 0042, STU-0164..STU-0168). The UI and the
 * headless `live` command both drive it.
 */
export interface LiveTutorsPort {
  /** The copy of Tutors the lecturer chose before, or null. */
  folder(): Promise<string | null>;
  /** Remembers `folder` as the lecturer's copy of Tutors if it can run the reader; otherwise says what to do and remembers nothing. */
  choose(folder: string): Promise<{ ok: true } | Failure>;
  /** Builds the course, serves it, makes sure the reader runs, and shows the course in it. */
  start(progress?: (step: string) => void): Promise<{ ok: true; link: string } | Failure>;
  /** Heard after a change to the course: rebuilds and refreshes Tutors. Changes heard during a rebuild cause one more, not one each. */
  changed(): Promise<LiveUpdate>;
  /** Stops serving the course, and the reader if Studio started it. */
  stop(): Promise<void>;
  /** Whether the course is live now. */
  readonly live: boolean;
  /** The link to the course in Tutors while it is live. */
  readonly link: string | null;
}
