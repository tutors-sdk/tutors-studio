/**
 * One spelling for a course folder, so the app (a path from the folder chooser) and an assistant's server
 * (a path typed in a terminal) name the same course alike (ADRs 0051, 0052): forward slashes, no slash at
 * the end, and on Windows, where case doesn't matter, lower case. Expects an absolute path.
 */
export function courseKey(folder: string, windows: boolean): string {
  const slashed = folder.replaceAll("\\", "/");
  const trimmed = slashed.length > 1 ? slashed.replace(/\/+$/, "") : slashed;
  return windows ? trimmed.toLowerCase() : trimmed;
}

/** What an assistant is told when the plan it applied waits for the lecturer instead (STU-0205). */
export const PLAN_WAITS =
  "Studio has this course open, so the plan is waiting on Check and publish for the lecturer to accept. Nothing has changed yet. Tell the lecturer what the plan does.";
