/**
 * Driving port: publishing the open course. The UI and the headless CLI both drive it. Previewing on this
 * computer never leaves the machine; saving it as a website or publishing to a host needs the course to have no errors.
 */
export type Failure = { ok: false; reason: string; detail: string };
export type PreviewResult = { ok: true; url: string } | Failure;
export type WebsiteResult = { ok: true; folder: string; page: string } | Failure;
export type PublishResult = { ok: true; siteUrl: string; readerUrl: string; uploaded: number } | Failure;

export interface PublishingPort {
  /** Builds the course and opens it in a Tutors reader on this computer. `progress` hears each step. */
  previewHere(progress?: (step: string) => void): Promise<PreviewResult>;
  /** Stops the reader on this computer. */
  stopPreview(): Promise<void>;
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
