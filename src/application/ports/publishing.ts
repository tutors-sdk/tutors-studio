/**
 * Driving port: publishing the open course. The UI and the headless CLI both drive it. Saving it, saving it
 * as a website and publishing it to a host each need the course to have no errors.
 */
export type Failure = { ok: false; reason: string; detail: string };
/** A course made compliant where it is: `added` names the standard setup files written, `warnings` what is left to look at. */
export type SaveResult = { ok: true; added: string[]; warnings: number } | Failure;
export type WebsiteResult = { ok: true; folder: string; page: string } | Failure;
/** `at` is the ISO time it went online. */
export type PublishResult = { ok: true; siteUrl: string; readerUrl: string; uploaded: number; at: string } | Failure;

export interface PublishingPort {
  /**
   * The main outcome of publishing: a compliant Tutors course in its own folder. Confirms it passes the
   * Tutors rules (Studio checks names and keys at every step, so this refuses only what the map already
   * shows) and adds the standard setup it lacks (netlify.toml, the .gitignore line; pressing Save accepts
   * that plan, ADR 0030). Needs no generator or container. Putting it on Netlify is a later, optional step.
   */
  save(progress?: (step: string) => void): Promise<SaveResult>;
  /** The host's name ("Netlify") and whether Studio holds a sign-in for it. */
  host(): Promise<{ name: string; signedIn: boolean }>;
  /** The site this course was last published as, remembered per course (STU-0113); null before its first publish. */
  site(): Promise<string | null>;
  /**
   * What changed since the course was last published, one sentence each in a lecturer's words ("Added: Lab
   * "Set up"."), and when that was; null before its first publish (feature 8).
   */
  changes(): Promise<{ at: string; lines: string[] } | null>;
  /** The weeks, by folder path, with a file changed since the course was last published; none before its first publish (STU-0139). */
  weeksChanged(): Promise<string[]>;
  /**
   * Checks the course, builds it as a website of its own, and saves that in a new folder inside `parent`
   * on this computer, named for the course. `page` is the website's first page, to open.
   */
  saveWebsite(parent: string, courseName: string, progress?: (step: string) => void): Promise<WebsiteResult>;
  /**
   * The one deploy button (feature 7): saves the course with the standard setup it lacks (ADR 0030),
   * checks, builds and publishes it as the given site, and remembers the site for this course.
   */
  publish(site: string, progress?: (step: string) => void): Promise<PublishResult>;
}
