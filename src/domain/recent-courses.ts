/** The courses a lecturer opened lately (feature 9): newest first, each once, at most eight. Pure. */
export const RECENT_LIMIT = 8;

export function withRecent(list: readonly string[], path: string): string[] {
  return [path, ...list.filter((other) => other !== path)].slice(0, RECENT_LIMIT);
}

/** A course put back where it was, after the lecturer forgot it by mistake: at most eight, each once. Pure. */
export function withRestored(list: readonly string[], path: string, at: number): string[] {
  const others = list.filter((other) => other !== path);
  const place = Math.max(0, Math.min(at, others.length));
  return [...others.slice(0, place), path, ...others.slice(place)].slice(0, RECENT_LIMIT);
}

/** A course folder's name as the start screen shows it: the last part of its path. */
export const courseNameOf = (path: string): string => path.split(/[\\/]/).filter(Boolean).pop() ?? path;
