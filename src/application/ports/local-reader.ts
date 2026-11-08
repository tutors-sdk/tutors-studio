/**
 * Driven port: a Tutors reader on this computer showing the built course, so a lecturer sees exactly what
 * students will before anything is published. Nothing leaves the machine.
 */
export type LocalReaderOutcome = { ok: true; url: string } | { ok: false; reason: string; detail: string };

export interface LocalReaderPort {
  /** Serves the built folder and starts the reader; a second start replaces the first. */
  start(builtFolder: string): Promise<LocalReaderOutcome>;
  stop(): Promise<void>;
}
