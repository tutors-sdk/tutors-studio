/**
 * Driven port: a copy of a folder Studio generated inside the course (the website in html/), saved as a
 * new folder in a place the lecturer chose. It never writes into the course, and never over a folder
 * that is already there (ADR 0029).
 */
export type SaveCopyOutcome = { ok: true; folder: string } | { ok: false; reason: string; detail: string };

export interface SaveCopyPort {
  /**
   * Copies the course's `from` folder to a new folder `name` inside `parent`; when `name` is taken, the
   * first free "name-2", "name-3"… Resolves to the folder made.
   */
  saveCopy(from: string, parent: string, name: string): Promise<SaveCopyOutcome>;
}
