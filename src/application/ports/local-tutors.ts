import type { TutorsFolderFacts } from "../../domain/live-tutors.ts";
import type { Failure } from "./publishing.ts";

/** The reader running and the course served beside it: `link` opens the course in that reader. */
export type LiveStart = { ok: true; link: string; startedReader: boolean } | Failure;

/**
 * Driven port: Tutors on this computer (ADR 0042). Serves the open course's built folder on this computer
 * only, starts the reader from the lecturer's copy of the Tutors repository unless one already answers, and
 * shows the course in it. The Tauri adapter does this from the Rust side, with a Tutors window of its own;
 * the Node adapter serves the headless CLI.
 */
export interface LocalTutorsPort {
  /** What Studio can see in a folder the lecturer chose as their copy of Tutors. */
  facts(folder: string): Promise<TutorsFolderFacts>;
  /** Serves the built course and makes sure the reader runs from `folder`; `progress` hears each step. */
  start(folder: string, progress?: (step: string) => void): Promise<LiveStart>;
  /** Shows the course in Tutors: a window of its own in the app; the link printed for the CLI. */
  show(link: string): Promise<void>;
  /** Reloads the course in Tutors on the page the lecturer is on, after a rebuild. */
  refresh(): Promise<void>;
  /** Stops serving the course, and the reader if Studio started it. */
  stop(): Promise<void>;
}
