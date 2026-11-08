/**
 * Driven port: hands a course off through the lecturer's own git, the step 9 "Commit and push". The git
 * adapter runs the computer's git in the course folder, with whatever sign-in it already has (ADR 0021).
 */
export interface GitStatus {
  /** False when the course folder isn't a git repository (or git isn't installed). */
  isRepository: boolean;
  branch: string | null;
  /** Paths git reports as changed, new or deleted since the last commit. */
  changedFiles: string[];
  /** The remote a push goes to ("origin" when there is one), or null when the repository has none. */
  remote: string | null;
}

export type GitOutcome = { ok: true; summary: string } | { ok: false; reason: string; detail: string };

export interface PublishPort {
  status(): Promise<GitStatus>;
  /** Adds every change, commits it with the message, and pushes the branch to its remote. */
  commitAndPush(message: string): Promise<GitOutcome>;
}
