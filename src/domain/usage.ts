/**
 * Opt-in usage counts (issue #53, ADR 0037): how often lecturers publish, save, accept a change, send
 * with Git or take an assistant's proposal, as numbers by name only. Pure.
 */

/** The events Studio counts, in the words Settings shows them in. Any other event is never counted. */
export const countedEvents: Readonly<Record<string, string>> = {
  "publish.done": "Courses published",
  "course.saved": "Courses saved",
  "website.saved": "Websites saved",
  "plan.applied": "Changes accepted",
  "handoff.pushed": "Changes sent with Git",
  "assistant.drafted": "Lab drafts from the assistant",
  "assistant.suggested": "Week suggestions from the assistant",
};

/** Counts by event name. */
export type UsageCounts = Record<string, number>;

/** The counts with one more of `name`, or the same counts when Studio doesn't count it. */
export function countOne(counts: UsageCounts, name: string): UsageCounts {
  if (!Object.hasOwn(countedEvents, name)) return counts;
  return { ...counts, [name]: (counts[name] ?? 0) + 1 };
}

/** Only counted names with whole, non-negative numbers: anything else in the store is dropped. */
export function readCounts(stored: unknown): UsageCounts {
  const counts: UsageCounts = {};
  if (stored === null || typeof stored !== "object") return counts;
  for (const name of Object.keys(countedEvents)) {
    const value = (stored as Record<string, unknown>)[name];
    if (typeof value === "number" && Number.isInteger(value) && value > 0) counts[name] = value;
  }
  return counts;
}

/** Each counted event in Settings' words with its count, zero included, in the order above. */
export function usageLines(counts: UsageCounts): { words: string; count: number }[] {
  return Object.entries(countedEvents).map(([name, words]) => ({ words, count: counts[name] ?? 0 }));
}

/** What "Copy the counts" gives: Studio's version and the counts by name, as JSON, and nothing else. */
export function usageReport(counts: UsageCounts, version: string): string {
  return JSON.stringify({ studio: version, counts: readCounts(counts) }, null, 2);
}
