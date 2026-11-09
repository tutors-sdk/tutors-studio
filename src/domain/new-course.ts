import { slugify } from "./slug.ts";

/**
 * Guided course creation (spec "three questions, not a hundred decisions", ADR 0012). The lecturer
 * answers three questions; the shape is derived from a pattern and the calendar, never configured.
 */
export interface CourseAnswers {
  /** 1. What is the course called, and who teaches it? */
  name: string;
  lecturer: string;
  /** 2. When does it run? The Monday teaching starts (YYYY-MM-DD), the teaching weeks, and the week a reading week follows. */
  start: string;
  weeks: number;
  readingWeek: number | null;
  /** 3. How do you teach it? A pattern id. */
  pattern: string;
  /** 4. What does a teaching week hold? Absent or null for the pattern's own week. */
  shape?: WeekShape | null;
}

/** How many lectures, labs and readings each teaching week holds. */
export interface WeekShape {
  lectures: number;
  labs: number;
  readings: number;
}

export const MAX_PER_WEEK = 5;

export const sameShape = (a: WeekShape, b: WeekShape): boolean => a.lectures === b.lectures && a.labs === b.labs && a.readings === b.readings;

const counted = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** "2 lectures, 1 lab and 1 reading", leaving out the kinds a week doesn't have. */
export function describeShape(shape: WeekShape): string {
  const parts = [
    shape.lectures > 0 ? counted(shape.lectures, "lecture", "lectures") : "",
    shape.labs > 0 ? counted(shape.labs, "lab", "labs") : "",
    shape.readings > 0 ? counted(shape.readings, "reading", "readings") : "",
  ].filter((part) => part !== "");
  return parts.length <= 1 ? (parts[0] ?? "nothing") : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** What each weekly topic holds for a shape, in teaching order, titled the way tutors-create titles a pattern's items ({n} is the week). */
export function weekItems(shape: WeekShape): { kind: "talk" | "lab" | "note"; title: string }[] {
  const many = (count: number, kind: "talk" | "lab" | "note", word: string) =>
    Array.from({ length: count }, (_, i) => ({ kind, title: count === 1 ? `Week {n} ${word}` : `Week {n} ${word} ${i + 1}` }));
  return [...many(shape.lectures, "talk", "lecture"), ...many(shape.labs, "lab", "lab"), ...many(shape.readings, "note", "reading")];
}

/** A teaching pattern as a card: what one week's topic holds, and what the side unit holds, as kind labels. */
export interface PatternCard {
  id: string;
  name: string;
  description: string;
  pickedWhen: string;
  week: { label: string; title: string }[];
  side: { label: string; title: string }[];
  /** The week the pattern gives, as counts: what the shape question starts from. */
  shape: WeekShape;
}

export type AnswerField = "name" | "start" | "weeks" | "readingWeek" | "pattern" | "shape";

export interface AnswerProblem {
  field: AnswerField;
  /** What to change, for the lecturer. */
  message: string;
}

export const MAX_WEEKS = 52;

function isRealDate(text: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (match === null) return false;
  const time = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Date(time).toISOString().slice(0, 10) === text;
}

/** The folder the new course is created in: the name as Tutors names folders. */
export const courseFolderName = (answers: Pick<CourseAnswers, "name">): string => slugify(answers.name);

/** Every answer that has to change before a course can be created, each naming its field. */
export function checkAnswers(answers: CourseAnswers, patternIds: readonly string[]): AnswerProblem[] {
  const problems: AnswerProblem[] = [];
  if (courseFolderName(answers) === "") problems.push({ field: "name", message: "Give the course a name with at least one letter or number." });
  if (!isRealDate(answers.start)) problems.push({ field: "start", message: "Choose the date teaching starts." });
  const weeksOk = Number.isInteger(answers.weeks) && answers.weeks >= 1 && answers.weeks <= MAX_WEEKS;
  if (!weeksOk) problems.push({ field: "weeks", message: `Teaching weeks must be a whole number from 1 to ${MAX_WEEKS}.` });
  if (answers.readingWeek !== null && weeksOk && (!Number.isInteger(answers.readingWeek) || answers.readingWeek < 1 || answers.readingWeek >= answers.weeks)) {
    problems.push({ field: "readingWeek", message: `The reading week must follow a teaching week from 1 to ${answers.weeks - 1}.` });
  }
  if (!patternIds.includes(answers.pattern)) problems.push({ field: "pattern", message: "Choose how you teach the course." });
  const shape = answers.shape;
  if (shape) {
    const counts = [shape.lectures, shape.labs, shape.readings];
    if (!counts.every((count) => Number.isInteger(count) && count >= 0 && count <= MAX_PER_WEEK))
      problems.push({ field: "shape", message: `Each week can hold from 0 to ${MAX_PER_WEEK} lectures, labs and readings, as whole numbers.` });
    else if (counts.every((count) => count === 0)) problems.push({ field: "shape", message: "A week needs at least one lecture, lab or reading." });
  }
  return problems;
}
