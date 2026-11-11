import { slugify } from "./slug.ts";
import { TEMPLATE_LENGTHS, templateById, type TemplateId } from "./templates.ts";

/**
 * Guided course creation (ADR 0012): two questions, not a hundred decisions. The lecturer names the course,
 * then says how a teaching week breaks down; the folders follow from that, never configured. No dates: a
 * course starts undated, and the lecturer adds a calendar when they want one (Leigh, 2026-11-09).
 */
export interface CourseAnswers {
  /** 1. What is the course called, and who teaches it? */
  name: string;
  lecturer: string;
  /** 2. How does a teaching week break down? How many weeks, what each week holds, and whether students build a project. */
  weeks: number;
  shape: WeekShape;
  project: boolean;
  /** A starter template to begin from instead of the shaped week (ADR 0039); its own week replaces `shape` and `project`. */
  template?: TemplateId;
}

/** How many lectures, labs and readings each teaching week holds. */
export interface WeekShape {
  lectures: number;
  labs: number;
  readings: number;
}

export const MAX_PER_WEEK = 5;

/** The week a new course starts from, before the lecturer changes it: a lecture and a lab. */
export const defaultShape: WeekShape = { lectures: 1, labs: 1, readings: 0 };

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

export type AnswerField = "name" | "weeks" | "shape" | "template";

export interface AnswerProblem {
  field: AnswerField;
  /** What to change, for the lecturer. */
  message: string;
}

export const MAX_WEEKS = 52;

/** The folder the new course is created in: the name as Tutors names folders. */
export const courseFolderName = (answers: Pick<CourseAnswers, "name">): string => slugify(answers.name);

/** Every answer that has to change before a course can be created, each naming its field. */
export function checkAnswers(answers: CourseAnswers): AnswerProblem[] {
  const problems: AnswerProblem[] = [];
  if (courseFolderName(answers) === "") problems.push({ field: "name", message: "Give the course a name with at least one letter or number." });
  if (answers.template !== undefined) {
    if (templateById(answers.template) === undefined) problems.push({ field: "template", message: "Pick one of the templates Studio offers." });
    if (!(TEMPLATE_LENGTHS as readonly number[]).includes(answers.weeks))
      problems.push({ field: "weeks", message: `A template runs for ${TEMPLATE_LENGTHS.slice(0, -1).join(", ")} or ${TEMPLATE_LENGTHS[TEMPLATE_LENGTHS.length - 1]} weeks.` });
    return problems;
  }
  if (!(Number.isInteger(answers.weeks) && answers.weeks >= 1 && answers.weeks <= MAX_WEEKS))
    problems.push({ field: "weeks", message: `Teaching weeks must be a whole number from 1 to ${MAX_WEEKS}.` });
  const counts = [answers.shape.lectures, answers.shape.labs, answers.shape.readings];
  if (!counts.every((count) => Number.isInteger(count) && count >= 0 && count <= MAX_PER_WEEK))
    problems.push({ field: "shape", message: `Each week can hold from 0 to ${MAX_PER_WEEK} lectures, labs and readings, as whole numbers.` });
  else if (counts.every((count) => count === 0)) problems.push({ field: "shape", message: "A week needs at least one lecture, lab or reading." });
  return problems;
}
