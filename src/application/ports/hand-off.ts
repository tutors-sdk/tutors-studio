import type { Plan } from "../../domain/plan.ts";
import type { GitOutcome, GitStatus } from "./publish.ts";

/** Where the course stands before it is handed off: the spec's "Ready to publish" is no errors and unpublished changes. */
export interface HandOffStatus {
  errors: number;
  git: GitStatus;
  /** True when the course's .gitignore leaves out the json/ folder the generator writes. */
  ignoresBuild: boolean;
}

/** Driving port: step 9's publish hand-off through git. */
export interface HandOffPort {
  status(): Promise<HandOffStatus>;
  /** The plan that adds json/ to the course's .gitignore (creating it when there is none). Nothing is written. */
  planIgnoreBuild(): Promise<Plan>;
  /** Commits and pushes, only for a course with no errors whose .gitignore leaves out json/. */
  commitAndPush(message: string): Promise<GitOutcome>;
}
