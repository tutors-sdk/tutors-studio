/**
 * Running the term (STU-0196 to STU-0199, ADR 0049): which teaching week it is, what is hidden and when it
 * is due out, and next year's course from this one. A release date is kept beside the ignore list that
 * hides a week, in properties.yaml, as `release:` with one `<folder>: YYYY-MM-DD` line each. A hidden week
 * only appears when the course is published again, so a due week is a reminder and one press, never a
 * change made on its own.
 */

const DAY = 86_400_000;

const utc = (date: string) => Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));

/** Today as YYYY-MM-DD, by the computer's own calendar. */
export const dayOf = (now: Date): string => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

/** The teaching week a day falls in, counting the start's week as 1; 0 before teaching starts. */
export function teachingWeek(start: string, today: string): number {
  const days = Math.floor((utc(today) - utc(start)) / DAY);
  return days < 0 ? 0 : Math.floor(days / 7) + 1;
}

/** A date as a lecturer reads it: "2 Feb 2027". */
export function readableDate(date: string): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(date.slice(8, 10))} ${months[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;
}

/** The Monday on or before a day, so a calendar dated from it starts on a Monday. */
export function mondayOf(date: string): string {
  const at = new Date(utc(date));
  const back = (at.getUTCDay() + 6) % 7;
  return new Date(utc(date) - back * DAY).toISOString().slice(0, 10);
}

/** The ids properties.yaml's ignore list hides, written as a block list or inline. */
export function hiddenIn(yaml: string): string[] {
  const lines = yaml.replace(/\r\n/g, "\n").split("\n");
  const at = lines.findIndex((line) => /^ignore\s*:/.test(line));
  if (at === -1) return [];
  const inline = /^ignore\s*:\s*\[(.*)\]/.exec(lines[at]);
  if (inline)
    return inline[1]
      .split(",")
      .map((id) => id.trim().replace(/^["']|["']$/g, ""))
      .filter((id) => id !== "");
  const ids: string[] = [];
  for (const line of lines.slice(at + 1)) {
    const item = /^\s*-\s*(.+?)\s*$/.exec(line);
    if (!item) break;
    ids.push(item[1].replace(/^["']|["']$/g, ""));
  }
  return ids;
}

/** Each release date properties.yaml keeps, by the top-level folder it is for. */
export function releasesIn(yaml: string): Record<string, string> {
  const lines = yaml.replace(/\r\n/g, "\n").split("\n");
  const at = lines.findIndex((line) => /^release\s*:\s*$/.test(line));
  if (at === -1) return {};
  const found: Record<string, string> = {};
  for (const line of lines.slice(at + 1)) {
    const entry = /^\s+([\w.-]+)\s*:\s*["']?(\d{4}-\d{2}-\d{2})["']?\s*$/.exec(line);
    if (!entry) break;
    found[entry[1]] = entry[2];
  }
  return found;
}

/** properties.yaml with one folder's release date set, or taken out when `date` is null; every other line kept. */
export function withRelease(yaml: string, folder: string, date: string | null): string {
  const releases = releasesIn(yaml);
  if (date === null) delete releases[folder];
  else releases[folder] = date;
  const lines = yaml.replace(/\r\n/g, "\n").split("\n");
  const kept: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^release\s*:\s*$/.test(lines[i])) {
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) i++;
      continue;
    }
    kept.push(lines[i]);
  }
  while (kept.at(-1) === "") kept.pop();
  const entries = Object.entries(releases).sort(([a], [b]) => a.localeCompare(b));
  const block = entries.length === 0 ? [] : ["release:", ...entries.map(([id, day]) => `  ${id}: ${day}`)];
  const all = [...kept, ...block];
  return all.length === 0 ? "" : `${all.join("\n")}\n`;
}

/** properties.yaml for next year's copy: no release dates, every other line kept. */
export const withoutReleases = (yaml: string): string => Object.keys(releasesIn(yaml)).reduce((text, folder) => withRelease(text, folder, null), yaml);

/** What a top-level week or unit is to the term view. */
export interface TermPlace {
  path: string;
  title: string;
  hidden: boolean;
  release: string | null;
}

export interface Term {
  /** The calendar's first day. */
  starts: string;
  /** The teaching week today falls in (0 before teaching starts), and its week's title when the course has that many. */
  week: number;
  current: { path: string; title: string } | null;
  /** How many weeks of teaching the course has. */
  weeks: number;
  /** Hidden from students, each with its release date if it has one. */
  hidden: TermPlace[];
  /** Hidden, with a release date that has come: each is offered for publishing (STU-0198). */
  due: TermPlace[];
}

/** The term view's reading of the course: today's teaching week, what's hidden, and what is due out. */
export function termOf(starts: string, today: string, weeks: readonly { path: string; title: string }[], places: readonly TermPlace[]): Term {
  const week = teachingWeek(starts, today);
  const current = week >= 1 && week <= weeks.length ? weeks[week - 1] : null;
  const hidden = places.filter((place) => place.hidden);
  return { starts, week, current, weeks: weeks.length, hidden, due: hidden.filter((place) => place.release !== null && place.release <= today) };
}

/** What the term view says about the week, in the lecturer's words. */
export function termWords(term: Term): string {
  const weekCount = term.weeks;
  if (term.week === 0) return `Teaching starts on ${readableDate(term.starts)}.`;
  if (term.current === null || term.week > weekCount) return `The ${weekCount === 1 ? "week" : `${weekCount} weeks`} of teaching are over.`;
  return `This is week ${term.week} of the term: ${term.current.title}.`;
}

/** What a due week says. */
export const dueWords = (title: string, release: string, today: string) => `${title} is due out ${release === today ? "today" : `since ${readableDate(release)}`}.`;

/** Whether a file goes into next year's copy: everything but built output, the bin, git and the computer's own files. */
export const keptOnRollOver = (path: string): boolean => !/^(json|html|\.git|\.tutors-bin|node_modules|\.netlify)(\/|$)/.test(path) && !/(^|\/)\.DS_Store$/.test(path);
