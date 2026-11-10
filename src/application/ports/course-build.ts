import type { Finding } from "../../domain/finding.ts";

/** Driven port: builds the open course with the Tutors generator into its json/ folder, as Netlify's build would. */
export type BuildOutcome = { ok: true; folder: string; generator: string } | { ok: false; reason: string; detail: string };

export interface CourseBuildPort {
  build(): Promise<BuildOutcome>;
  /** Builds the course as a website of its own (tutors-lite) into its html/ folder: pages any browser opens. */
  buildWebsite(): Promise<BuildOutcome>;
  /**
   * The course checked by the pinned Tutors command line, `tutors validate --format json` (ADR 0034): its
   * findings, a failure when it couldn't run or answered with something else, or null when Studio carries no
   * command line that validates.
   */
  validate(): Promise<GateOutcome>;
  /** Whether Studio carries a command line that validates, so `validate` does more than answer null. */
  readonly validates: boolean;
}

export type GateOutcome = { ok: true; findings: Finding[] } | { ok: false; reason: string; detail: string } | null;
