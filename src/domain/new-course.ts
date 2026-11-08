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
}

/** A teaching pattern as a card: what one week's topic holds, and what the side unit holds, as kind labels. */
export interface PatternCard {
  id: string;
  name: string;
  description: string;
  pickedWhen: string;
  week: { label: string; title: string }[];
  side: { label: string; title: string }[];
}

export type AnswerField = "name" | "start" | "weeks" | "readingWeek" | "pattern";

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
  return problems;
}
