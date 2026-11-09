/** Driven port: builds the open course with the Tutors generator into its json/ folder, as Netlify's build would. */
export type BuildOutcome = { ok: true; folder: string; generator: string } | { ok: false; reason: string; detail: string };

export interface CourseBuildPort {
  build(): Promise<BuildOutcome>;
  /** Builds the course as a website of its own (tutors-lite) into its html/ folder: pages any browser opens. */
  buildWebsite(): Promise<BuildOutcome>;
}
