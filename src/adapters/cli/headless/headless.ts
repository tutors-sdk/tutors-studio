import { publishedOn } from "../../../domain/changes.ts";
import { tookFor } from "../../../domain/live-tutors.ts";
import { defaultShape, type CourseAnswers } from "../../../domain/new-course.ts";
import { courseTemplates, TEMPLATE_LENGTHS, type TemplateId } from "../../../domain/templates.ts";
import { cellWords } from "../../../domain/outcomes.ts";
import { readableDate, termWords } from "../../../domain/term.ts";
import { engagementWords } from "../../../domain/engagement.ts";
import { createRollOver } from "../../../application/use-cases/term.ts";
import { exampleCourses, exampleItemCount } from "../../../domain/example-courses.ts";
import { createNewCourse, type NewCourseDeps } from "../../../application/use-cases/new-course.ts";
import type { ArrangePlan, AuthoringPort, QuizTarget } from "../../../application/ports/authoring.ts";
import type { PublishingPort } from "../../../application/ports/publishing.ts";
import type { HandOffPort } from "../../../application/ports/hand-off.ts";
import type { QuizForm } from "../../../domain/quiz.ts";
import type { ArrangeAction } from "../../../domain/arrange.ts";
import type { DroppedFile } from "../../../domain/material.ts";
import { createLoadedCourse, readLoadedFolder, type LoadCourseDeps } from "../../../application/use-cases/load-course.ts";
import type { FileSystemPort } from "../../../application/ports/file-system.ts";
import type { LiveTutorsPort } from "../../../application/ports/live-tutors.ts";

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
  if (command === "outcomes") return runOutcomes(authoring, target, print);
  if (command === "tag") return runTag(authoring, target, print);
  if (command === "term") return runTerm(authoring, print);
  if (command === "release") return runRelease(authoring, target, print);
  if (command === "show-due") return runShowDue(authoring, target, print);
  if (command === "engagement") return runEngagement(authoring, print);
  if (command !== "check" && command !== "fix") {
    print(
      `Unknown command "${command}". Use check, fix, quiz, add-quiz, save-quiz, history, undo, arrange, details, outcomes, tag, term, release, show-due, roll-over, engagement or picture.`,
    );
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
 * `outcomes`: the course's outcomes and the coverage map, week by week, with its flags. `outcomes
 * "Understand: Students can ...|Apply: Students can ..."` writes them, keeping the id of each one already
 * there in the same place, and `outcomes none` takes them all out (STU-0187 to STU-0192).
 */
async function runOutcomes(authoring: AuthoringPort, words: string, print: (line: string) => void): Promise<number> {
  if (words.trim() !== "") {
    const before = await authoring.outcomes();
    const drafts =
      words.trim() === "none"
        ? []
        : words.split("|").map((pair, index) => {
            const at = pair.indexOf(":");
            return { id: before[index]?.id, level: pair.slice(0, at).trim(), text: pair.slice(at + 1).trim() };
          });
    return applyPlanned(authoring, await authoring.planOutcomes(drafts), print);
  }
  const map = await authoring.coverage();
  if (map === null) {
    print("This course has no learning outcomes yet.");
    return 0;
  }
  for (const row of map.rows) {
    print(`${row.outcome.id} (${row.outcome.level}) ${row.outcome.text}${row.flags.length > 0 ? `: ${row.flags.join("; ")}` : ""}`);
    row.cells.forEach((cell, index) => {
      if (cell.length > 0) print(`  ${map.weeks[index].title}: ${cellWords(cell)}`);
    });
  }
  for (const week of map.weeks) if (week.flag !== null) print(`${week.title}: ${week.flag}`);
  for (const unknown of map.unknown) print(`${unknown.id} is named by ${unknown.items.join(", ")} but is not one of the course's outcomes.`);
  return 0;
}

/** `tag <item> LO1,LO3`: the item serves these outcomes; `tag <item> none` takes them off (STU-0188). */
async function runTag(authoring: AuthoringPort, words: string, print: (line: string) => void): Promise<number> {
  const [item = "", ids = ""] = words.trim().split(/\s+/);
  const wanted =
    ids === "none"
      ? []
      : ids
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id !== "");
  return applyPlanned(authoring, await authoring.planTag(item, wanted), print);
}

/** `term`: today's teaching week, what is hidden and when it is due out, and what is due now (STU-0196, STU-0198). */
async function runTerm(authoring: AuthoringPort, print: (line: string) => void): Promise<number> {
  const term = await authoring.term();
  if (term === null) {
    print('This course has no calendar. Give it a start date with details "start=YYYY-MM-DD" first.');
    return 0;
  }
  print(termWords(term));
  for (const place of term.hidden) print(`Hidden: ${place.title}${place.release === null ? "" : `, due out ${readableDate(place.release)}`}`);
  for (const place of term.due) print(`Due: ${place.title}. Run show-due ${place.path}, then publish.`);
  return 0;
}

/** `engagement`: each week's figures, counts only; with no engagement adapter bound, says there are none (STU-0200, STU-0201). */
async function runEngagement(authoring: AuthoringPort, print: (line: string) => void): Promise<number> {
  const figures = await authoring.engagement();
  if (figures === null) {
    print("No engagement figures: Studio isn't reading Tutors' time data for this course.");
    return 0;
  }
  for (const week of Object.values(figures)) print(`${week.path}: ${engagementWords(week)}`);
  return 0;
}

/** `release <folder> YYYY-MM-DD`: hidden from students until that day; `release <folder> none` takes the date away (STU-0197). */
async function runRelease(authoring: AuthoringPort, words: string, print: (line: string) => void): Promise<number> {
  const [folder = "", date = ""] = words.trim().split(/\s+/);
  return applyPlanned(authoring, await authoring.planRelease(folder, date === "none" ? null : date), print);
}

/** `show-due <folder>`: shows a week whose release date has come; publish after it (STU-0198). */
async function runShowDue(authoring: AuthoringPort, folder: string, print: (line: string) => void): Promise<number> {
  return applyPlanned(authoring, await authoring.planShowDue(folder.trim()), print);
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
  "Usage: headless new <parent folder> --name <course> [--weeks N] [--lectures N] [--labs N] [--readings N] [--project] [--template <id>] [--example <id>] [--lecturer <name>]";

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
  const unknown = Object.keys(values).find((key) => !["name", "lecturer", "weeks", "lectures", "labs", "readings", "template", "example"].includes(key));
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
      ...(values.example === undefined ? {} : { example: values.example }),
    },
  };
}

/** `headless templates`: the template with what its weeks hold and its lengths, then each reference course to start from (STU-0162). */
export function runTemplates(print: (line: string) => void): number {
  for (const template of courseTemplates) print(`--template ${template.id}: ${template.name}. ${template.week} ${TEMPLATE_LENGTHS.join(", ")} weeks.`);
  for (const example of exampleCourses)
    print(`--example ${example.id}: ${example.name}, shaped on ${example.modelledOn}. ${example.weeks.length} weeks, ${exampleItemCount(example)} items.`);
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

/**
 * `headless <course> live [tutors folder]`: the course live in Tutors on this computer. With no folder, in the
 * Tutors reader inside Studio (ADR 0045); with one, in the lecturer's own copy (ADR 0042), run there or used if
 * already running. Builds the course, serves it, prints the link, then rebuilds after every change `watch`
 * hears until `until` resolves (Ctrl+C), and stops.
 */
export async function runLive(
  live: LiveTutorsPort,
  tutorsFolder: string,
  print: (line: string) => void,
  watch: (onChange: () => void) => () => void,
  until: Promise<void>,
): Promise<number> {
  if (tutorsFolder === "" && !live.inside) {
    print("Name your copy of Tutors: live <folder you cloned tutors-sdk/tutors-mono-repo into>.");
    return 2;
  }
  if (tutorsFolder !== "") {
    const chosen = await live.choose(tutorsFolder);
    if (!chosen.ok) return failed(chosen, print);
  }
  const started = await live.start((step) => print(`… ${step}`));
  if (!started.ok) return failed(started, print);
  print(`Live in Tutors: ${started.link}`);
  print("Every change to the course rebuilds it. Press Ctrl+C to stop.");
  const unwatch = watch(() => {
    void live.changed().then((update) => {
      if (update.ok) print(`Tutors is up to date: rebuilt ${tookFor(update.ms)}.`);
      else {
        print(update.reason);
        if (update.detail !== "") print(update.detail);
      }
    });
  });
  await until;
  unwatch();
  await live.stop();
  print("Stopped: Tutors on this computer no longer shows the course.");
  return 0;
}

export const rollOverUsage = "Usage: headless <course folder> roll-over <parent folder> --name <next year's course> [--start YYYY-MM-DD]";

/**
 * `roll-over <parent> --name <course> [--start YYYY-MM-DD]`: next year's course from this one, in a new
 * folder in the parent, with the same content and outcomes, no release dates, and a calendar from the
 * Monday of the start (STU-0199). This course is never changed.
 */
export async function runRollOver(deps: (parent: string) => NewCourseDeps, source: FileSystemPort, args: readonly string[], print: (line: string) => void): Promise<number> {
  const [parent, ...rest] = args;
  const value = (flag: string) => {
    const at = rest.indexOf(flag);
    return at === -1 ? undefined : rest[at + 1];
  };
  if (parent === undefined || parent.startsWith("--") || value("--name") === undefined) {
    print(rollOverUsage);
    return 1;
  }
  const made = await createRollOver(deps(parent), source, { name: value("--name")!, start: value("--start") ?? null });
  if (!made.ok) {
    print(made.reason);
    return 1;
  }
  print(`Made ${made.folder} from this course.`);
  return 0;
}
