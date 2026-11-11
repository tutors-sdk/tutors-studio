import { placedForTutors } from "../../domain/attachments.ts";
import { courseFolderName } from "../../domain/new-course.ts";
import { trayReason, type DroppedFile } from "../../domain/material.ts";
import type { Plan } from "../../domain/plan.ts";
import type { CourseRulesPort } from "../ports/course-rules.ts";
import type { FileSystemPort } from "../ports/file-system.ts";
import { applyPlan } from "./apply-plan.ts";

/** What a lecturer tells Studio about a folder of material it makes a course from. */
export interface LoadAnswers {
  name: string;
  lecturer: string;
  /** The Monday teaching starts (YYYY-MM-DD), or null for a course with no calendar yet. */
  start: string | null;
}

/** A folder the lecturer pointed at: a Tutors course Studio opens as it is, or their own material to make a course from. */
export type LoadedFolder = { kind: "course" } | { kind: "material"; files: DroppedFile[] };

/** Folders that are never material: version control, editors, dependencies and Tutors' own build output. */
const SKIPPED = new Set([".git", ".github", ".vscode", ".idea", "node_modules", "json", "html", "_site", ".netlify"]);
const LINK_FILE = /\.(url|webloc|txt)$/i;
const LINK_LIMIT = 16 * 1024;

/** Reads a folder the lecturer pointed at. One with a course.md is a Tutors course; anything else is material, read whole. */
export async function readLoadedFolder(fs: FileSystemPort): Promise<LoadedFolder> {
  if (await fs.exists("course.md")) return { kind: "course" };
  const files: DroppedFile[] = [];
  const walk = async (dir: string) => {
    for (const entry of await fs.list(dir)) {
      if (entry.name.startsWith(".") || SKIPPED.has(entry.name)) continue;
      const path = dir === "" ? entry.name : `${dir}/${entry.name}`;
      if (entry.kind === "dir") await walk(path);
      else files.push({ path, bytes: await fs.read(path) });
    }
  };
  await walk("");
  return { kind: "material", files };
}

export interface LoadPlan {
  folder: string;
  plan: Plan;
  weeks: number;
  items: number;
  /** Files Studio leaves where they are, with the reason, for the lecturer to place by hand. */
  tray: { path: string; message: string }[];
}

export type LoadProblem = { field: "name" | "start" | "material"; message: string };

const isRealDate = (text: string) => /^\d{4}-\d{2}-\d{2}$/.test(text) && new Date(`${text}T00:00:00Z`).toISOString().slice(0, 10) === text;

/**
 * The plan for a new course made from a folder of material: every file written fresh into a folder named
 * after the course. The folder the material came from is only read. Nothing is written here (ADR 0004).
 */
export function planLoadedCourse(
  rules: CourseRulesPort,
  answers: LoadAnswers,
  files: readonly DroppedFile[],
  newId: () => string,
): { ok: true; load: LoadPlan } | { ok: false; problems: LoadProblem[] } {
  const problems: LoadProblem[] = [];
  if (courseFolderName(answers) === "") problems.push({ field: "name", message: "Give the course a name with at least one letter or number." });
  if (answers.start !== null && !isRealDate(answers.start)) problems.push({ field: "start", message: "Choose the date teaching starts, or leave it empty." });
  const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
  const laid = rules.importCourse(
    answers,
    files.map((file) => (LINK_FILE.test(file.path) && file.bytes.length <= LINK_LIMIT ? { path: file.path, text: text(file.bytes) } : { path: file.path })),
  );
  if (laid.items === 0)
    problems.push({
      field: "material",
      message:
        "Studio found nothing in this folder it can place in a week. It looks for slides (PDF), notes (Markdown or Word), labs, zips and links with a week number in their names.",
    });
  if (problems.length > 0) return { ok: false, problems };
  const encoder = new TextEncoder();
  const bytesOf = new Map(files.map((file) => [file.path, file.bytes]));
  const ops = placedForTutors([
    ...laid.files.map((file) => ({ op: "write" as const, path: file.path, content: encoder.encode(file.content) })),
    ...laid.copies.map((copy) => ({ op: "write" as const, path: copy.to, content: bytesOf.get(copy.from)! })),
  ]);
  const weeks = `${laid.weeks} week${laid.weeks === 1 ? "" : "s"}`;
  return {
    ok: true,
    load: {
      folder: courseFolderName(answers),
      plan: { id: newId(), summary: `Create ${answers.name.trim()} from your material: ${weeks}, ${laid.items} item${laid.items === 1 ? "" : "s"}`, ops },
      weeks: laid.weeks,
      items: laid.items,
      tray: laid.tray.map((file) => ({ path: file.path, message: trayReason(file) })),
    },
  };
}

export interface LoadCourseDeps {
  rules: CourseRulesPort;
  newId: () => string;
  /** Makes the empty folder for the course and returns the file system rooted at it; fails, creating nothing, when it exists. */
  makeFolder: (name: string) => Promise<FileSystemPort>;
}

export type LoadResult = { ok: true; folder: string; fs: FileSystemPort; load: LoadPlan } | { ok: false; problems: LoadProblem[]; reason: string };

/** Makes the course a folder of material describes: makes its folder, then applies the plan whole. */
export async function createLoadedCourse(deps: LoadCourseDeps, answers: LoadAnswers, files: readonly DroppedFile[]): Promise<LoadResult> {
  const planned = planLoadedCourse(deps.rules, answers, files, deps.newId);
  if (!planned.ok) return { ok: false, problems: planned.problems, reason: planned.problems[0].message };
  let fs: FileSystemPort;
  try {
    fs = await deps.makeFolder(planned.load.folder);
  } catch (error) {
    return { ok: false, problems: [], reason: `Nothing was created: ${error instanceof Error ? error.message : String(error)}` };
  }
  const applied = await applyPlan(fs, planned.load.plan);
  if (!applied.ok) return { ok: false, problems: [], reason: `The course wasn't created: ${applied.blockedBy} (${applied.reason})` };
  return { ok: true, folder: planned.load.folder, fs, load: planned.load };
}
