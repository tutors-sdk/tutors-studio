import type { LibraryVisit } from "../../domain/library-tutors.ts";
import type { Failure } from "./publishing.ts";

/**
 * Driven port: library courses in Tutors on this computer (ADR 0068). Builds a course from a library folder
 * without changing it: from a copy in Studio's own folder, with the Tutors generator, served on this computer
 * only. The Tauri adapter does this on the Rust side and lists the courses in the Tutors window; the Node
 * adapter serves the scenarios.
 */
export interface LibraryTutorsPort {
  /** Copies the course in `folder` into Studio's own folder, builds the copy and serves its build; the port it is served on. */
  serve(folder: string): Promise<{ ok: true; port: number } | Failure>;
  /**
   * Lists `courses` on the reader's home page at `link` once the Tutors window shows it, taking off the ones
   * listed before that aren't among them, and leaving every other course there as it is (STU-0320).
   */
  list(link: string, courses: LibraryVisit[]): Promise<void>;
  /** Stops serving every library course. */
  stop(): Promise<void>;
}
