import { checkAnswers, courseFolderName, describeShape, sameShape, type AnswerProblem, type CourseAnswers } from "../../domain/new-course.ts";
import type { Plan } from "../../domain/plan.ts";
import type { CourseRulesPort } from "../ports/course-rules.ts";
import type { FileSystemPort } from "../ports/file-system.ts";
import { applyPlan } from "./apply-plan.ts";

export type NewCoursePlan = { ok: true; folder: string; plan: Plan } | { ok: false; problems: AnswerProblem[] };

/**
 * The plan for a new course from the three answers: every file, written fresh, into a folder named after
 * the course. Nothing is written; the lecturer sees the summary and accepts it (ADR 0004).
 */
export function planNewCourse(rules: CourseRulesPort, answers: CourseAnswers, newId: () => string): NewCoursePlan {
  const cards = rules.patterns();
  const problems = checkAnswers(
    answers,
    cards.map((card) => card.id),
  );
  if (problems.length > 0) return { ok: false, problems };
  const pattern = cards.find((card) => card.id === answers.pattern)!;
  const encoder = new TextEncoder();
  const ops = rules.newCourseFiles(answers).map((file) => ({ op: "write" as const, path: file.path, content: encoder.encode(file.content) }));
  const shaped = answers.shape && !sameShape(answers.shape, pattern.shape) ? `, each with ${describeShape(answers.shape)}` : "";
  const reading = answers.readingWeek === null ? "" : `, reading week after week ${answers.readingWeek}`;
  return {
    ok: true,
    folder: courseFolderName(answers),
    plan: {
      id: newId(),
      summary: `Create ${answers.name.trim()}: ${answers.weeks} week${answers.weeks === 1 ? "" : "s"} of ${pattern.name.toLowerCase()}${shaped}${reading}`,
      ops,
    },
  };
}

export interface NewCourseDeps {
  rules: CourseRulesPort;
  newId: () => string;
  /**
   * Makes the empty folder for the course and returns the file system rooted at it. Fails, creating
   * nothing, when the folder already exists, so a lecturer's work is never written over.
   */
  makeFolder: (name: string) => Promise<FileSystemPort>;
}

export type NewCourseResult = { ok: true; folder: string; fs: FileSystemPort } | { ok: false; problems: AnswerProblem[]; reason: string };

/** Creates the course the accepted answers describe: makes its folder, then applies the plan whole. */
export async function createNewCourse(deps: NewCourseDeps, answers: CourseAnswers): Promise<NewCourseResult> {
  const planned = planNewCourse(deps.rules, answers, deps.newId);
  if (!planned.ok) return { ok: false, problems: planned.problems, reason: planned.problems[0].message };
  let fs: FileSystemPort;
  try {
    fs = await deps.makeFolder(planned.folder);
  } catch (error) {
    return { ok: false, problems: [], reason: `Nothing was created: ${error instanceof Error ? error.message : String(error)}` };
  }
  const applied = await applyPlan(fs, planned.plan);
  if (!applied.ok) return { ok: false, problems: [], reason: `The course wasn't created: ${applied.blockedBy} (${applied.reason})` };
  return { ok: true, folder: planned.folder, fs };
}
