import type { CourseAnswers } from "../../../domain/new-course.ts";
import { createNewCourse, type NewCourseDeps } from "../../../application/use-cases/new-course.ts";
import type { AuthoringPort, QuizTarget } from "../../../application/ports/authoring.ts";
import type { QuizForm } from "../../../domain/quiz.ts";

/**
 * The headless driver: `check` prints every finding, `fix` applies each finding's safe fix one plan at a
 * time and checks again, `preview <folder>` says what Studio would show of the folder's decks and
 * diagrams, `quiz <folder>` shows the quiz as the designer opens it, and `add-quiz <topic> <form>` and
 * `save-quiz <quiz folder> <form>` save a designer's form (JSON) through an accepted plan. Returns the
 * exit code: 0 clean, 1 errors remain or nothing saved, 2 unknown command.
 */
export async function runHeadless(authoring: AuthoringPort, command: string, print: (line: string) => void, target = "", form?: QuizForm): Promise<number> {
  if (command === "preview") return runPreview(authoring, target, print);
  if (command === "quiz") return runQuiz(authoring, target, print);
  if (command === "add-quiz" || command === "save-quiz") return saveQuiz(authoring, command, target, form, print);
  if (command !== "check" && command !== "fix") {
    print(`Unknown command "${command}". Use check, fix, preview, quiz, add-quiz or save-quiz.`);
    return 2;
  }
  let view = await authoring.refresh();
  if (command === "fix") {
    for (const finding of view.findings) {
      const plan = authoring.planFix(finding);
      if (plan === null) continue;
      const result = await authoring.apply(plan);
      print(result.ok ? `Fixed: ${plan.summary}` : `Couldn't ${plan.summary.toLowerCase()}: ${result.blockedBy} (${result.reason})`);
    }
    view = await authoring.refresh();
  }
  for (const finding of view.findings) print(`${finding.severity.padEnd(5)} ${finding.path === "" ? "(course folder)" : finding.path}: ${finding.message}`);
  const errors = view.findings.filter((f) => f.severity === "error").length;
  print(errors === 0 ? "Everything checks out." : `${errors} problem${errors === 1 ? "" : "s"} to fix before publishing.`);
  return errors === 0 ? 0 : 1;
}

const listed = (items: readonly (string | number)[]) => (items.length === 1 ? `${items[0]}` : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);

/** `preview <folder>`: one line per deck or page Studio would preview there. Exit 0, or 1 when there is nothing to show. */
async function runPreview(authoring: AuthoringPort, folder: string, print: (line: string) => void): Promise<number> {
  const previews = await authoring.previews(folder);
  for (const preview of previews) {
    if (preview.kind === "slides") print(`${preview.file}: ${preview.slides.length} slide${preview.slides.length === 1 ? "" : "s"}`);
    else {
      const drawn = preview.diagrams.filter((diagram) => diagram.svg !== null).length;
      print(`${preview.file}: diagrams on lines ${listed(preview.diagrams.map((diagram) => diagram.line))}, ${drawn} drawn`);
    }
  }
  if (previews.length === 0) print(`Nothing to preview in ${folder === "" ? "the course folder" : folder}.`);
  return previews.length === 0 ? 1 : 0;
}

/** `quiz <folder>`: the quiz as the designer opens it, in the lecturer's words. Exit 0, or 1 when the folder has no quiz page. */
async function runQuiz(authoring: AuthoringPort, folder: string, print: (line: string) => void): Promise<number> {
  const opened = await authoring.openQuiz(folder);
  if (opened.page === null) {
    print(`There is no quiz page in ${folder}.`);
    return 1;
  }
  const { form } = opened;
  print(`Quiz: ${form.heading}`);
  print(form.timeLimit === null ? "Untimed" : `${form.timeLimit} seconds per question`);
  form.questions.forEach((question, index) => {
    print(`${index + 1}. ${question.text}`);
    question.answers.forEach((answer, at) => print(`   ${at === question.right ? "[right]" : "[     ]"} ${answer}`));
  });
  for (const sentence of opened.leftOut) print(`Left out: ${sentence}`);
  return 0;
}

/** `add-quiz` and `save-quiz`: plan the form's quiz, then apply the plan as an accepted one. */
async function saveQuiz(authoring: AuthoringPort, command: string, folder: string, form: QuizForm | undefined, print: (line: string) => void): Promise<number> {
  if (form === undefined) {
    print(`${command} needs the quiz as a JSON file.`);
    return 1;
  }
  let target: QuizTarget = { newIn: folder };
  if (command === "save-quiz") {
    const page = (await authoring.openQuiz(folder)).page;
    if (page === null) {
      print(`There is no quiz page in ${folder}.`);
      return 1;
    }
    target = { page };
  }
  const planned = await authoring.planQuiz(target, form);
  if (!planned.ok) {
    print(planned.message);
    return 1;
  }
  const result = await authoring.apply(planned.plan);
  print(result.ok ? `Done: ${planned.plan.summary}.` : `Nothing changed: ${result.blockedBy} (${result.reason}).`);
  return result.ok ? 0 : 1;
}

export const newUsage = "Usage: headless new <parent folder> --name <course> --start YYYY-MM-DD --weeks N --pattern <id> [--lecturer <name>] [--reading-week N]";

/** Reads `new <parent> --name ...` into the three answers. Returns a message when the arguments are wrong. */
export function parseNewArgs(args: readonly string[]): { parent: string; answers: CourseAnswers } | string {
  const values: Record<string, string> = {};
  const loose: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (!args[i].startsWith("--")) {
      loose.push(args[i]);
      continue;
    }
    const value = args[i + 1];
    if (value === undefined) return `${args[i]} needs a value. ${newUsage}`;
    values[args[i].slice(2)] = value;
    i++;
  }
  const unknown = Object.keys(values).find((key) => !["name", "lecturer", "start", "weeks", "reading-week", "pattern"].includes(key));
  if (unknown !== undefined) return `Unknown option --${unknown}. ${newUsage}`;
  if (loose.length !== 1) return `Name one parent folder. ${newUsage}`;
  return {
    parent: loose[0],
    answers: {
      name: values.name ?? "",
      lecturer: values.lecturer ?? "",
      start: values.start ?? "",
      weeks: Number(values.weeks ?? "12"),
      readingWeek: values["reading-week"] === undefined ? null : Number(values["reading-week"]),
      pattern: values.pattern ?? "",
    },
  };
}

/**
 * `headless new`: the three-question start without a window. Prints what it made, or each answer to
 * change. Returns 0 when the course was created, 1 otherwise.
 */
export async function runHeadlessNew(deps: (parent: string) => NewCourseDeps, args: readonly string[], print: (line: string) => void): Promise<number> {
  const parsed = parseNewArgs(args);
  if (typeof parsed === "string") {
    print(parsed);
    return 1;
  }
  const result = await createNewCourse(deps(parsed.parent), parsed.answers);
  if (!result.ok) {
    for (const line of result.problems.length > 0 ? result.problems.map((p) => `${p.field}: ${p.message}`) : [result.reason]) print(line);
    return 1;
  }
  print(`Created ${result.folder}.`);
  return 0;
}
