import { defaultShape, type CourseAnswers } from "../../../domain/new-course.ts";
import { createNewCourse, type NewCourseDeps } from "../../../application/use-cases/new-course.ts";
import type { AuthoringPort, QuizTarget } from "../../../application/ports/authoring.ts";
import type { PublishingPort } from "../../../application/ports/publishing.ts";
import type { HandOffPort } from "../../../application/ports/hand-off.ts";
import type { QuizForm } from "../../../domain/quiz.ts";
import { createLoadedCourse, readLoadedFolder, type LoadCourseDeps } from "../../../application/use-cases/load-course.ts";
import type { FileSystemPort } from "../../../application/ports/file-system.ts";

/**
 * The headless driver: `check` prints every finding, `fix` applies every safe fix as one plan (the
 * window's "Fix all safe") and checks again, `quiz <folder>` shows the quiz as the designer opens it, and `add-quiz <topic> <form>` and
 * `save-quiz <quiz folder> <form>` save a designer's form (JSON) through an accepted plan. Returns the
 * exit code: 0 clean, 1 errors remain or nothing saved, 2 unknown command.
 */
export async function runHeadless(authoring: AuthoringPort, command: string, print: (line: string) => void, target = "", form?: QuizForm): Promise<number> {
  if (command === "quiz") return runQuiz(authoring, target, print);
  if (command === "add-quiz" || command === "save-quiz") return saveQuiz(authoring, command, target, form, print);
  if (command !== "check" && command !== "fix") {
    print(`Unknown command "${command}". Use check, fix, quiz, add-quiz or save-quiz.`);
    return 2;
  }
  if (command === "fix") {
    const plan = await authoring.planFixAll();
    if (plan !== null) {
      const result = await authoring.apply(plan);
      print(result.ok ? `Fixed: ${plan.summary}` : `Couldn't ${plan.summary.toLowerCase()}: ${result.blockedBy} (${result.reason})`);
    }
  }
  const view = await authoring.refresh();
  for (const finding of view.findings) print(`${finding.severity.padEnd(5)} ${finding.path === "" ? "(course folder)" : finding.path}: ${finding.message}`);
  const errors = view.findings.filter((f) => f.severity === "error").length;
  print(errors === 0 ? "Everything checks out." : `${errors} problem${errors === 1 ? "" : "s"} to fix before publishing.`);
  return errors === 0 ? 0 : 1;
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

export const newUsage = "Usage: headless new <parent folder> --name <course> [--weeks N] [--lectures N] [--labs N] [--readings N] [--project] [--lecturer <name>]";

/** Reads `new <parent> --name ...` into the answers. Returns a message when the arguments are wrong. */
export function parseNewArgs(args: readonly string[]): { parent: string; answers: CourseAnswers } | string {
  const values: Record<string, string> = {};
  const loose: string[] = [];
  let project = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--project") {
      project = true;
      continue;
    }
    if (!args[i].startsWith("--")) {
      loose.push(args[i]);
      continue;
    }
    const value = args[i + 1];
    if (value === undefined) return `${args[i]} needs a value. ${newUsage}`;
    values[args[i].slice(2)] = value;
    i++;
  }
  const unknown = Object.keys(values).find((key) => !["name", "lecturer", "weeks", "lectures", "labs", "readings"].includes(key));
  if (unknown !== undefined) return `Unknown option --${unknown}. ${newUsage}`;
  if (loose.length !== 1) return `Name one parent folder. ${newUsage}`;
  // With none of --lectures, --labs or --readings the week is the default; with any, the rest default to none.
  const shaped = values.lectures !== undefined || values.labs !== undefined || values.readings !== undefined;
  return {
    parent: loose[0],
    answers: {
      name: values.name ?? "",
      lecturer: values.lecturer ?? "",
      weeks: Number(values.weeks ?? "12"),
      shape: shaped ? { lectures: Number(values.lectures ?? "0"), labs: Number(values.labs ?? "0"), readings: Number(values.readings ?? "0") } : defaultShape,
      project,
    },
  };
}

/**
 * `headless new`: the new-course questions without a window. Prints what it made, or each answer to
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

/**
 * `save`, `save-website <parent folder>` and `publish <site>`: the publishing journeys without a
 * window. Prints each step, then the link or folder, or the reason and the tool's last lines. Returns 0
 * on success, 1 otherwise.
 */
export async function runPublishing(publishing: PublishingPort, command: string, print: (line: string) => void, site = "", courseName = ""): Promise<number> {
  const step = (line: string) => print(`… ${line}`);

  if (command === "save") {
    const result = await publishing.save(step);
    if (!result.ok) return failed(result, print);
    if (result.added.length > 0) print(`Added the standard setup: ${result.added.join(", ")}.`);
    print("The course passes the Tutors rules and has the setup Tutors expects. It is saved in its own folder, ready to publish to Netlify whenever you like.");
    if (result.warnings > 0) print(`${result.warnings} suggestion${result.warnings === 1 ? "" : "s"} to look at when you have time; none stops it.`);
    return 0;
  }
  if (command === "save-website") {
    if (site === "") {
      print("Name the folder to save the website in: save-website <parent folder>.");
      return 2;
    }
    const result = await publishing.saveWebsite(site, courseName, step);
    if (!result.ok) return failed(result, print);
    print(`Saved the course as a website in ${result.folder}. Open ${result.page} in any browser.`);
    return 0;
  }
  if (command === "publish") {
    const host = await publishing.host();
    if (!host.signedIn) {
      print(`Sign in to ${host.name} first: set NETLIFY_AUTH_TOKEN to a personal access token.`);
      return 1;
    }
    const result = await publishing.publish(site, step);
    if (!result.ok) return failed(result, print);
    print(`Published to ${host.name}: ${result.siteUrl} (${result.uploaded} file${result.uploaded === 1 ? "" : "s"} sent).`);
    print(`Students read it at ${result.readerUrl}`);
    return 0;
  }
  print(`Unknown command "${command}". Use save, save-website <parent folder> or publish <site>.`);
  return 2;
}

function failed(result: { reason: string; detail: string }, print: (line: string) => void): number {
  print(result.reason);
  for (const line of result.detail === "" ? [] : result.detail.split("\n")) print(`  ${line}`);
  return 1;
}

/**
 * Step 9's hand-off from a terminal: `ignore-build` applies the plan that leaves json/ out of git, and
 * `push "<message>"` commits and pushes with the computer's git. Returns 0 on success, 1 otherwise.
 */
export async function runHandOff(handOff: HandOffPort, authoring: AuthoringPort, command: string, print: (line: string) => void, message = ""): Promise<number> {
  if (command === "ignore-build") {
    const plan = await handOff.planIgnoreBuild();
    const result = await authoring.apply(plan);
    print(result.ok ? `Done: ${plan.summary}` : `Couldn't ${plan.summary.toLowerCase()}: ${result.blockedBy} (${result.reason})`);
    return result.ok ? 0 : 1;
  }
  if (command === "push") {
    const outcome = await handOff.commitAndPush(message);
    if (!outcome.ok) {
      failed(outcome, print);
      if (!(await handOff.status()).ignoresBuild) print("The ignore-build command adds it.");
      return 1;
    }
    print(outcome.summary);
    return 0;
  }
  print(`Unknown command "${command}". Use push "<message>" or ignore-build.`);
  return 2;
}

export const loadUsage = "Usage: headless load <folder> <parent folder> --name <course> [--lecturer <name>] [--start YYYY-MM-DD]";

/**
 * `headless load`: points Studio at a folder. A Tutors course is left as it is, to open; a folder of the
 * lecturer's own material becomes a new course in the parent folder, and the folder itself is only read.
 */
export async function runHeadlessLoad(source: FileSystemPort, deps: (parent: string) => LoadCourseDeps, args: readonly string[], print: (line: string) => void): Promise<number> {
  const values: Record<string, string> = {};
  const loose: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (!args[i].startsWith("--")) {
      loose.push(args[i]);
      continue;
    }
    if (args[i + 1] === undefined || !["name", "lecturer", "start"].includes(args[i].slice(2))) {
      print(loadUsage);
      return 2;
    }
    values[args[i].slice(2)] = args[++i];
  }
  const loaded = await readLoadedFolder(source);
  if (loaded.kind === "course") {
    print("This folder is already a Tutors course: open it as it is.");
    return 0;
  }
  if (loose.length !== 1) {
    print(loadUsage);
    return 2;
  }
  const result = await createLoadedCourse(deps(loose[0]), { name: values.name ?? "", lecturer: values.lecturer ?? "", start: values.start ?? null }, loaded.files);
  if (!result.ok) {
    for (const line of result.problems.length > 0 ? result.problems.map((p) => `${p.field}: ${p.message}`) : [result.reason]) print(line);
    return 1;
  }
  print(`Created ${result.folder}: ${result.load.plan.summary.slice(result.load.plan.summary.indexOf(": ") + 2)}.`);
  for (const file of result.load.tray) print(`Left in your folder: ${file.path}. ${file.message}`);
  return 0;
}
