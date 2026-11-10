/** The courses a lecturer opened lately (feature 9): newest first, each once, at most eight. Pure. */
export const RECENT_LIMIT = 8;

export function withRecent(list: readonly string[], path: string): string[] {
  return [path, ...list.filter((other) => other !== path)].slice(0, RECENT_LIMIT);
}

/** A course folder's name as the start screen shows it: the last part of its path. */
export const courseNameOf = (path: string): string => path.split(/[\\/]/).filter(Boolean).pop() ?? path;
