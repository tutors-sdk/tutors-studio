import { publishedOn } from "../../../domain/changes.ts";
import { defaultShape, type CourseAnswers } from "../../../domain/new-course.ts";
import { courseTemplates, TEMPLATE_LENGTHS, type TemplateId } from "../../../domain/templates.ts";
import { createNewCourse, type NewCourseDeps } from "../../../application/use-cases/new-course.ts";
import type { ArrangePlan, AuthoringPort, QuizTarget } from "../../../application/ports/authoring.ts";
import type { PublishingPort } from "../../../application/ports/publishing.ts";
import type { HandOffPort } from "../../../application/ports/hand-off.ts";
import type { QuizForm } from "../../../domain/quiz.ts";
import type { ArrangeAction } from "../../../domain/arrange.ts";
import type { DroppedFile } from "../../../domain/material.ts";
import { createLoadedCourse, readLoadedFolder, type LoadCourseDeps } from "../../../application/use-cases/load-course.ts";
import type { FileSystemPort } from "../../../application/ports/file-system.ts";

/**
 * The headless driver: `check` prints every finding, `fix` applies every safe fix as one plan (the
 * window's "Fix all safe") and checks again, `quiz <folder>` shows the quiz as the designer opens it, and `add-quiz <topic> <form>` and
 * `save-quiz <quiz folder> <form>` save a designer's form (JSON) through an accepted plan, `history` lists what
 * this session changed and `undo [change]` puts back the latest change (or the one named). Returns the
 * exit code: 0 clean, 1 errors remain or nothing saved, 2 unknown command.
 */
export async function runHeadless(authoring: AuthoringPort, command: string, print: (line: string) => void, target = "", form?: QuizForm): Promise<number> {
  if (command === "quiz") return runQuiz(authoring, target, print);
  if (command === "add-quiz" || command === "save-quiz") return saveQuiz(authoring, command, target, form, print);
  if (command === "history") return runHistory(authoring, print);
  if (command === "undo") return runUndo(authoring, target, print);
  if (command === "arrange") return runArrange(authoring, target, print);
  if (command === "details") return runDetails(authoring, target, print);
  if (command !== "check" && command !== "fix") {
    print(`Unknown command "${command}". Use check, fix, quiz, add-quiz, save-quiz, history, undo, arrange, details or picture.`);
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

/** `history`: each change this session applied, newest first. */
function runHistory(authoring: AuthoringPort, print: (line: string) => void): number {
  const entries = authoring.history();
  if (entries.length === 0) print("Studio hasn't changed this course yet.");
  for (const entry of entries) print(`${entry.at} ${entry.undone ? "(put back) " : ""}${entry.summary}`);
  return 0;
}

/** `undo [change]`: the plan that puts back the latest change still in place, or the one named, applied as accepted. */
async function runUndo(authoring: AuthoringPort, id: string, print: (line: string) => void): Promise<number> {
  const latest = authoring.history().find((entry) => !entry.undone);
  const chosen = id === "" ? latest?.id : id;
  if (chosen === undefined) {
    print("There is nothing to put back.");
    return 1;
  }
  const planned = await authoring.planUndo(chosen);
  if (!planned.ok) {
    print(planned.message);
    return 1;
  }
  const result = await authoring.apply(planned.plan);
  print(result.ok ? `Done: ${planned.plan.summary}.` : `Nothing changed: ${result.blockedBy} couldn't be changed (${result.reason}).`);
  return result.ok ? 0 : 1;
}

/** Prints a plan, applies it as accepted, and says how it went: 0 when it applied, 1 when it was refused. */
async function applyPlanned(authoring: AuthoringPort, planned: ArrangePlan, print: (line: string) => void): Promise<number> {
  if (!planned.ok) {
    print(planned.message);
    return 1;
  }
  print(`Plan: ${planned.plan.summary}.`);
  for (const note of planned.notes) print(note);
  const result = await authoring.apply(planned.plan);
  print(result.ok ? `Done: ${planned.plan.summary}.` : `Nothing changed: ${result.blockedBy} couldn't be changed (${result.reason}).`);
  return result.ok ? 0 : 1;
}

/**
 * `details "title=...|credits=...|start=YYYY-MM-DD"`: the course's details, any left out kept as they are.
 * With nothing given, prints them.
 */
async function runDetails(authoring: AuthoringPort, words: string, print: (line: string) => void): Promise<number> {
  const now = await authoring.courseDetails();
  if (words.trim() === "") {
    print(`Title: ${now.title}`);
    print(`Credits: ${now.credits === "" ? "none" : now.credits}`);
    print(`Starts: ${now.start ?? "no calendar"}`);
    return 0;
  }
  const given = new Map(
    words.split("|").map((pair) => {
      const at = pair.indexOf("=");
      return [pair.slice(0, at).trim(), pair.slice(at + 1)] as const;
    }),
  );
  return applyPlanned(
    authoring,
    await authoring.planDetails({ title: given.get("title") ?? now.title, credits: given.get("credits") ?? now.credits, start: given.get("start") ?? now.start }),
    print,
  );
}

/** `picture <folder> <file>`: makes a file the card picture for a folder ("" for the course), applied as accepted. */
export async function runPicture(authoring: AuthoringPort, folder: string, file: DroppedFile, print: (line: string) => void): Promise<number> {
  return applyPlanned(authoring, await authoring.planPicture(folder, file), print);
}

/**
 * `arrange "<action> ..."`: reorder <folder> <item> <item>..., move <item> <into>, retitle <item> <title...>,
 * hide <week>, show <week>, remove <item>, restore <name> <into>. Prints the plan and its notes, then applies
 * it as accepted. Exit 0 when it applied, 1 when it was refused, 2 for words it doesn't know.
 */
async function runArrange(authoring: AuthoringPort, words: string, print: (line: string) => void): Promise<number> {
  const action = arrangeAction(words);
  if (action === null) {
    print(`Unknown arrangement "${words}". Use reorder, move, retitle, hide, show, remove or restore.`);
    return 2;
  }
  return applyPlanned(authoring, await authoring.planArrange(action), print);
}

function arrangeAction(words: string): ArrangeAction | null {
  const [verb, ...rest] = words.split(" ").map((word) => (word === '""' ? "" : word));
  if (verb === "reorder" && rest.length >= 2) return { action: "reorder", folder: rest[0], order: rest.slice(1) };
  if (verb === "move" && rest.length === 2) return { action: "move", item: rest[0], into: rest[1] };
  if (verb === "retitle" && rest.length >= 2) return { action: "retitle", item: rest[0], title: rest.slice(1).join(" ") };
  if ((verb === "hide" || verb === "show") && rest.length === 1) return { action: "hide", item: rest[0], hidden: verb === "hide" };
  if (verb === "remove" && rest.length === 1) return { action: "remove", item: rest[0] };
  if (verb === "restore" && rest.length === 2) return { action: "restore", name: rest[0], into: rest[1] };
  return null;
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

export const newUsage =
  "Usage: headless new <parent folder> --name <course> [--weeks N] [--lectures N] [--labs N] [--readings N] [--project] [--template <id>] [--lecturer <name>]";

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
  const unknown = Object.keys(values).find((key) => !["name", "lecturer", "weeks", "lectures", "labs", "readings", "template"].includes(key));
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
      ...(values.template === undefined ? {} : { template: values.template as TemplateId }),
    },
  };
}

/** `headless templates`: each starter template, what its weeks hold, the reference topic it follows and the lengths it comes in (STU-0148). */
export function runTemplates(print: (line: string) => void): number {
  for (const template of courseTemplates)
    print(`${template.id}: ${template.name}. ${template.week} Modelled on the reference course's ${template.modelledOn} topic. ${TEMPLATE_LENGTHS.join(", ")} weeks.`);
  return 0;
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
  if (command === "changes") {
    const changes = await publishing.changes();
    if (changes === null) {
      print("This course hasn't been published from Studio yet.");
      return 0;
    }
    print(`Since you last published, on ${publishedOn(changes.at)}:`);
    for (const line of changes.lines) print(line);
    const weeks = await publishing.weeksChanged();
    if (weeks.length > 0) print(`Weeks marked "Changed since you published": ${weeks.join(", ")}.`);
    return 0;
  }
  print(`Unknown command "${command}". Use save, save-website <parent folder>, publish <site> or changes.`);
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
