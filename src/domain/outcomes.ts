/**
 * Learning outcomes (STU-0187 to STU-0193, ADR 0048): what students should be able to do, each with a
 * Bloom level, kept in outcomes.yaml at the course root; each item names the ones it serves in one front
 * matter line, `outcomes: [LO1, LO3]`. A coverage map shows, week by week, where each is taught,
 * practised and assessed, and flags gaps. It never blocks anything.
 */

export const BLOOM_LEVELS = ["Remember", "Understand", "Apply", "Analyse", "Evaluate", "Create"] as const;
export type BloomLevel = (typeof BLOOM_LEVELS)[number];

export interface Outcome {
  /** LO1, LO2, ...: what items name in their outcomes line. Never reused once given. */
  id: string;
  /** A sentence that begins "Students can". */
  text: string;
  level: BloomLevel;
}

/** An outcome as the lecturer writes it on Course details: the id stays when it is kept, and a new one is given otherwise. */
export interface OutcomeDraft {
  id?: string;
  text: string;
  level: string;
}

/** Where outcomes are kept. */
export const OUTCOMES_FILE = "outcomes.yaml";

/** The words every outcome begins with. */
export const OUTCOME_START = "Students can";

const HEADER = `# What students can do by the end of this course, kept by Tutors Studio. Each lecture, lab or quiz
# names the ones it serves in its front matter, as outcomes: [LO1, LO3]. Tutors itself doesn't read this file yet.
`;

/** outcomes.yaml as Studio writes it: one entry per outcome, its sentence quoted. */
export function outcomesYaml(outcomes: readonly Outcome[]): string {
  if (outcomes.length === 0) return `${HEADER}outcomes: []\n`;
  const entries = outcomes.map((outcome) => `  - id: ${outcome.id}\n    level: ${outcome.level}\n    text: ${JSON.stringify(outcome.text)}\n`);
  return `${HEADER}outcomes:\n${entries.join("")}`;
}

const unquote = (value: string): string => {
  const text = value.trim();
  if (text.startsWith('"')) {
    try {
      return String(JSON.parse(text));
    } catch {
      return text.slice(1, -1);
    }
  }
  if (text.startsWith("'") && text.endsWith("'")) return text.slice(1, -1).replace(/''/g, "'");
  return text;
};

/** The outcomes in outcomes.yaml, in order; anything it can't read as an outcome is left out. */
export function parseOutcomes(yaml: string): Outcome[] {
  const found: Outcome[] = [];
  let current: Partial<Outcome> | null = null;
  const finish = () => {
    if (current?.id && current.text !== undefined && (BLOOM_LEVELS as readonly string[]).includes(current.level ?? "")) found.push(current as Outcome);
    current = null;
  };
  for (const line of yaml.replace(/\r\n/g, "\n").split("\n")) {
    const entry = /^\s*-\s+(\w+):\s*(.*)$/.exec(line);
    const field = /^\s+(\w+):\s*(.*)$/.exec(line);
    if (entry) {
      finish();
      current = {};
    }
    const [, key, value] = entry ?? field ?? [];
    if (current === null || key === undefined) continue;
    if (key === "id") current.id = unquote(value);
    else if (key === "text") current.text = unquote(value);
    else if (key === "level") current.level = unquote(value) as BloomLevel;
  }
  finish();
  return found;
}

/** The id the next outcome takes: one more than the highest LO number used, so an id is never reused. */
export function nextOutcomeId(outcomes: readonly Outcome[]): string {
  const highest = Math.max(0, ...outcomes.map((outcome) => Number(/^LO(\d+)$/.exec(outcome.id)?.[1] ?? 0)));
  return `LO${highest + 1}`;
}

/** What is wrong with an outcome as written, in the lecturer's words, or null when it is fine. */
export function outcomeProblem(text: string, level: string): string | null {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean.startsWith(OUTCOME_START) || clean.length <= OUTCOME_START.length) return `Write what students can do, starting "${OUTCOME_START}".`;
  if (!(BLOOM_LEVELS as readonly string[]).includes(level)) return `Choose one of the levels: ${BLOOM_LEVELS.join(", ")}.`;
  return null;
}

const FRONT = /^(﻿?)---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/;

/** The outcome ids a page's front matter names, as `outcomes: [LO1, LO3]`; none when it names none. */
export function outcomesOfPage(markdown: string): string[] {
  const front = FRONT.exec(markdown)?.[2] ?? "";
  const line = /^outcomes:\s*\[(.*)\]\s*$/m.exec(front);
  if (line === null) return [];
  return line[1]
    .split(",")
    .map((id) => unquote(id))
    .filter((id) => id !== "");
}

/**
 * A page with its outcomes line set to `ids` (added to its front matter, or front matter added), or taken
 * out when `ids` is empty; every other line kept as written.
 */
export function pageWithOutcomes(markdown: string, ids: readonly string[]): string {
  const line = `outcomes: [${ids.join(", ")}]`;
  const match = FRONT.exec(markdown);
  if (match === null) return ids.length === 0 ? markdown : `---\n${line}\n---\n${markdown}`;
  const [whole, bom, front, end] = match;
  const kept = front.split(/\r?\n/).filter((existing) => !/^outcomes:/.test(existing));
  const lines = ids.length === 0 ? kept : [...kept, line];
  const rest = markdown.slice(whole.length);
  if (lines.every((existing) => existing.trim() === "")) return `${bom}${rest}`;
  return `${bom}---\n${lines.join("\n")}\n---${end || "\n"}${rest}`;
}

/** How an item serves an outcome, by its kind: a lab practises it, a quiz assesses it, anything else teaches it. */
export type Serves = "taught" | "practised" | "assessed";

export const servesAs = (kind: string | null): Serves => (kind === "lab" ? "practised" : kind === "quiz" ? "assessed" : "taught");

/** A week as the coverage map reads it: its items in order, each with its kind and the outcomes it names. */
export interface CoverageWeek {
  path: string;
  title: string;
  items: { path: string; kind: string | null; outcomes: string[] }[];
}

export interface CoverageRow {
  outcome: Outcome;
  /** One cell per week, in order: how the week serves this outcome. */
  cells: Serves[][];
  flags: string[];
}

export interface Coverage {
  weeks: { path: string; title: string; flag: string | null }[];
  rows: CoverageRow[];
  /** Ids items name that no outcome has, with the items that name them. */
  unknown: { id: string; items: string[] }[];
}

export const NOT_PRACTISED = "Not yet practised";
export const ASSESSED_FIRST = "Assessed before it is taught";
export const NOT_SERVED = "No item serves it yet";
export const NOTHING_TAGGED = "Nothing tagged";

/**
 * The coverage map: outcomes down, weeks across, and its flags. Null for a course with no outcomes,
 * which shows no map and no flags (STU-0192).
 */
export function coverage(outcomes: readonly Outcome[], weeks: readonly CoverageWeek[]): Coverage | null {
  if (outcomes.length === 0) return null;
  const known = new Set(outcomes.map((outcome) => outcome.id));
  const rows = outcomes.map((outcome) => {
    const cells = weeks.map((week) => {
      const serves = week.items.filter((item) => item.outcomes.includes(outcome.id)).map((item) => servesAs(item.kind));
      return (["taught", "practised", "assessed"] as const).filter((kind) => serves.includes(kind));
    });
    const first = (kind: Serves) => cells.findIndex((cell) => cell.includes(kind));
    const flags: string[] = [];
    if (cells.every((cell) => cell.length === 0)) flags.push(NOT_SERVED);
    else {
      if (first("practised") === -1) flags.push(NOT_PRACTISED);
      const assessed = first("assessed");
      if (assessed !== -1 && (first("taught") === -1 || first("taught") > assessed)) flags.push(ASSESSED_FIRST);
    }
    return { outcome, cells, flags };
  });
  const unknown = new Map<string, string[]>();
  for (const week of weeks) for (const item of week.items) for (const id of item.outcomes) if (!known.has(id)) unknown.set(id, [...(unknown.get(id) ?? []), item.path]);
  return {
    weeks: weeks.map((week) => ({ path: week.path, title: week.title, flag: week.items.some((item) => item.outcomes.length > 0) ? null : NOTHING_TAGGED })),
    rows,
    unknown: [...unknown].map(([id, items]) => ({ id, items })),
  };
}

/** The words a cell shows, as the doc's example map does: "Lecture", "Lab", "Quiz", joined. */
export const cellWords = (cell: readonly Serves[]): string => cell.map((serves) => (serves === "taught" ? "Lecture" : serves === "practised" ? "Lab" : "Quiz")).join(", ");
