/**
 * Driving port: publishing the open course. The UI and the headless CLI both drive it. Saving it, saving it
 * as a website and publishing it to a host each need the course to have no errors.
 */
export type Failure = { ok: false; reason: string; detail: string };
/** A course made compliant where it is: `added` names the standard setup files written, `warnings` what is left to look at. */
export type SaveResult = { ok: true; added: string[]; warnings: number } | Failure;
export type WebsiteResult = { ok: true; folder: string; page: string } | Failure;
export type PublishResult = { ok: true; siteUrl: string; readerUrl: string; uploaded: number } | Failure;

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
  signIn(token: string): Promise<void>;
  /**
   * Checks the course, builds it as a website of its own, and saves that in a new folder inside `parent`
   * on this computer, named for the course. `page` is the website's first page, to open.
   */
  saveWebsite(parent: string, courseName: string, progress?: (step: string) => void): Promise<WebsiteResult>;
  /** Checks, builds and publishes the course as the given site. */
  publish(site: string, progress?: (step: string) => void): Promise<PublishResult>;
}
