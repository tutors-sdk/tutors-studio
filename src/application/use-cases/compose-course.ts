import { borrowedWords, COPY_NOTICE, copiedName, creditsPage, pickable, SOURCES_FILE, weeksNeeded, type ComposePick, type Source } from "../../domain/compose.ts";
import { courseFolderName } from "../../domain/new-course.ts";
import type { FileOp, Plan } from "../../domain/plan.ts";
import type { CourseRulesPort } from "../ports/course-rules.ts";
import type { FileSystemPort } from "../ports/file-system.ts";
import type { LibraryPort } from "../ports/library.ts";
import { applyPlan } from "./apply-plan.ts";

/** What a lecturer tells Studio about the course they are composing. */
export interface ComposeAnswers {
  name: string;
  lecturer: string;
  weeks: number;
}

export interface ComposePlan {
  folder: string;
  plan: Plan;
  /** Sentences to read before accepting: always the copy notice first (STU-0267). */
  notes: string[];
}

export type ComposeProblem = { field: "name" | "weeks" | "picks"; message: string };

export interface ComposeDeps {
  library: LibraryPort;
  rules: CourseRulesPort;
  newId: () => string;
  /** Today (YYYY-MM-DD), for the sources file. */
  today: () => string;
}

const joined = (dir: string, name: string) => (dir === "" ? name : `${dir}/${name}`);
const MAX_WEEKS = 52;

/** Every file in an item's folder in the library, by its path inside the item. Hidden files stay behind. */
async function itemFiles(library: LibraryPort, pick: ComposePick): Promise<{ path: string; bytes: Uint8Array }[]> {
  const root = joined(pick.course.path, pick.item.path);
  const found: { path: string; bytes: Uint8Array }[] = [];
  const walk = async (dir: string) => {
    for (const entry of await library.list(pick.course.library, joined(root, dir))) {
      if (entry.name.startsWith(".")) continue;
      const path = joined(dir, entry.name);
      if (entry.kind === "dir") await walk(path);
      else found.push({ path, bytes: await library.read(pick.course.library, joined(root, path)) });
    }
  };
  await walk("");
  return found.sort((a, b) => a.path.localeCompare(b.path));
}

/** SHA-256 over an item's files, path and bytes, in path order: the same files give the same digest anywhere. */
async function digestOf(files: readonly { path: string; bytes: Uint8Array }[]): Promise<string> {
  const encoder = new TextEncoder();
  const parts = files.flatMap((file) => [encoder.encode(`${file.path}\n${file.bytes.length}\n`), file.bytes]);
  const whole = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    whole.set(part, at);
    at += part.length;
  }
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", whole as BufferSource));
  return `sha256:${[...hash].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * The plan for a new course composed from library items: the course's own files, as New course makes them
 * with empty weeks, then each pick copied into its week under the next free number of its kind, a record of
 * where each came from, and a credits page in the module's own unit. Reads the library; writes nothing.
 */
export async function planComposedCourse(
  deps: ComposeDeps,
  answers: ComposeAnswers,
  picks: readonly ComposePick[],
): Promise<{ ok: true; compose: ComposePlan } | { ok: false; problems: ComposeProblem[] }> {
  const problems: ComposeProblem[] = [];
  const folder = courseFolderName(answers);
  if (folder === "") problems.push({ field: "name", message: "Give the course a name with at least one letter or number." });
  if (!(Number.isInteger(answers.weeks) && answers.weeks >= 1 && answers.weeks <= MAX_WEEKS))
    problems.push({ field: "weeks", message: `Teaching weeks must be a whole number from 1 to ${MAX_WEEKS}.` });
  else if (answers.weeks < weeksNeeded(picks))
    problems.push({ field: "weeks", message: `Something you picked goes in week ${weeksNeeded(picks)}, so the course needs at least ${weeksNeeded(picks)} weeks.` });
  if (picks.length === 0) problems.push({ field: "picks", message: "Pick at least one week or item from your library." });
  const unpickable = picks.find((pick) => !pickable(pick.item));
  if (unpickable) problems.push({ field: "picks", message: `${unpickable.item.title} holds weeks of its own: pick those weeks, or the items in them, instead.` });
  if (problems.length > 0) return { ok: false, problems };

  const encoder = new TextEncoder();
  const skeleton = deps.rules.newCourseFiles({
    name: answers.name.trim(),
    lecturer: answers.lecturer.trim(),
    weeks: answers.weeks,
    shape: { lectures: 0, labs: 0, readings: 0 },
    project: false,
  });
  const files = new Map<string, Uint8Array>(skeleton.map((file) => [file.path, encoder.encode(file.content)]));
  const weekFolders = skeleton
    .flatMap((file) => (/(^|\/)topic-\d+\/topic\.md$/.test(file.path) ? [file.path.slice(0, -"/topic.md".length)] : []))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const placeOf = (week: number) => (week === 0 ? "side" : weekFolders[week - 1]);
  const namesIn = (dir: string) => {
    const names = new Set<string>();
    for (const path of files.keys()) if (path.startsWith(`${dir}/`)) names.add(path.slice(dir.length + 1).split("/")[0]);
    return [...names];
  };
  const retitled = new Set<string>();
  const sources: Record<string, Source> = {};

  // Whole weeks first, so items picked for the same week number after what the week already holds.
  const ordered = [...picks].sort((a, b) => Number(b.item.kind === "topic") - Number(a.item.kind === "topic"));
  for (const pick of ordered) {
    const place = placeOf(pick.week);
    const copied = await itemFiles(deps.library, pick);
    let destination: string;
    if (pick.item.kind === "topic") {
      destination = place;
      const renamed = new Map<string, string>();
      for (const file of copied) {
        const [first, ...rest] = file.path.split("/");
        if (rest.length === 0) {
          // The week's own page takes the first borrowed week's title; any other loose file is kept if its name is free.
          if (first === "topic.md" && !retitled.has(place)) files.set(`${place}/topic.md`, file.bytes);
          else if (first !== "topic.md" && !files.has(`${place}/${first}`)) files.set(`${place}/${first}`, file.bytes);
          continue;
        }
        if (!renamed.has(first)) {
          const taken = namesIn(place);
          const kind = /^[a-z]+/.exec(first)?.[0] ?? first;
          // Kept as it is unless a folder of that kind already has its number (lab-01 beside lab-01-arrays).
          const numberOf = (name: string) => /^[a-z]+-?(\d+)/.exec(name)?.[1];
          const clashes = taken.some((name) => name === first || (name.startsWith(kind) && numberOf(name) !== undefined && Number(numberOf(name)) === Number(numberOf(first))));
          renamed.set(first, clashes ? copiedName(kind, first, taken) : first);
        }
        files.set(`${place}/${renamed.get(first)}/${rest.join("/")}`, file.bytes);
      }
      retitled.add(place);
    } else {
      const name = copiedName(pick.item.kind, pick.item.path.split("/").pop() ?? pick.item.kind, namesIn(place));
      destination = `${place}/${name}`;
      for (const file of copied) files.set(`${destination}/${file.path}`, file.bytes);
    }
    sources[destination] = {
      library: pick.course.library,
      course: pick.course.path,
      path: pick.item.path,
      from: pick.course.title,
      title: pick.item.title,
      digest: await digestOf(copied),
      copied: deps.today(),
    };
  }

  const credits = `side/${copiedName("note", "note-borrowed", namesIn("side"))}`;
  files.set(`${credits}/note.md`, encoder.encode(creditsPage(sources)));
  files.set(SOURCES_FILE, encoder.encode(`${JSON.stringify(sources, null, 2)}\n`));

  const ops: FileOp[] = [...files].map(([path, content]) => ({ op: "write", path, content }));
  const weeks = `${answers.weeks} week${answers.weeks === 1 ? "" : "s"}`;
  return {
    ok: true,
    compose: {
      folder,
      plan: { id: deps.newId(), summary: `Create ${answers.name.trim()}: ${weeks}, with ${borrowedWords(picks)}`, ops },
      notes: [COPY_NOTICE, "A page called Borrowed material in the module's own unit says what came from where."],
    },
  };
}

export type ComposeResult = { ok: true; folder: string; fs: FileSystemPort; compose: ComposePlan } | { ok: false; problems: ComposeProblem[]; reason: string };

/** Makes the composed course: makes its folder, then applies the plan whole (ADR 0004). */
export async function createComposedCourse(
  deps: ComposeDeps & { makeFolder: (name: string) => Promise<FileSystemPort> },
  answers: ComposeAnswers,
  picks: readonly ComposePick[],
): Promise<ComposeResult> {
  const planned = await planComposedCourse(deps, answers, picks);
  if (!planned.ok) return { ok: false, problems: planned.problems, reason: planned.problems[0].message };
  let fs: FileSystemPort;
  try {
    fs = await deps.makeFolder(planned.compose.folder);
  } catch (error) {
    return { ok: false, problems: [], reason: `Nothing was created: ${error instanceof Error ? error.message : String(error)}` };
  }
  const applied = await applyPlan(fs, planned.compose.plan);
  if (!applied.ok) return { ok: false, problems: [], reason: `The course wasn't created: ${applied.blockedBy} (${applied.reason})` };
  return { ok: true, folder: planned.compose.folder, fs, compose: planned.compose };
}
