import type { CourseFolder } from "../../domain/course-map.ts";
import { isDate, startOf } from "../../domain/course-details.ts";
import { courseFolderName } from "../../domain/new-course.ts";
import type { FileOp, Plan } from "../../domain/plan.ts";
import { dayOf, dueWords, hiddenIn, keptOnRollOver, mondayOf, readableDate, releasesIn, termOf, withoutReleases, withRelease, type Term } from "../../domain/term.ts";
import type { ArrangePlan } from "../ports/authoring.ts";
import type { CourseRulesPort } from "../ports/course-rules.ts";
import type { FileSystemPort } from "../ports/file-system.ts";
import { applyPlan } from "./apply-plan.ts";
import type { NewCourseDeps } from "./new-course.ts";

const PROPERTIES = "properties.yaml";
const CALENDAR = "calendar.yaml";
const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
const encode = (text: string) => new TextEncoder().encode(text);
const joined = (folder: string, name: string) => (folder === "" ? name : `${folder}/${name}`);
const weeksIn = (folder: CourseFolder): CourseFolder[] => (folder.kind === "topic" ? [folder] : folder.children.flatMap(weeksIn));
const titleOf = (folder: CourseFolder) => folder.title ?? folder.name;

/** The term view, release by date and roll over (STU-0196 to STU-0199): read from the course, changed only through accepted plans. */
export function termUseCases(deps: { fs: FileSystemPort; rules: CourseRulesPort; newId: () => string; now?: () => Date }) {
  const { fs, rules } = deps;
  const readText = async (path: string) => ((await fs.exists(path)) ? decode(await fs.read(path)) : null);
  const today = () => dayOf(deps.now?.() ?? new Date());

  /** The weeks and units at the top of the course: the only places Tutors can hide. */
  const topLevel = (tree: CourseFolder) => tree.children.filter((child) => child.kind === "topic" || child.kind === "unit");

  return {
    /** Today's teaching week, what is hidden and what is due out; null for a course with no calendar (STU-0196). */
    async term(): Promise<Term | null> {
      const starts = startOf((await readText(CALENDAR)) ?? "");
      if (starts === null) return null;
      const tree = await rules.buildTree(fs);
      const properties = (await readText(PROPERTIES)) ?? "";
      const hidden = new Set(hiddenIn(properties));
      const releases = releasesIn(properties);
      const places = topLevel(tree).map((folder) => ({ path: folder.path, title: titleOf(folder), hidden: hidden.has(folder.path), release: releases[folder.path] ?? null }));
      return termOf(
        starts,
        today(),
        weeksIn(tree).map((week) => ({ path: week.path, title: titleOf(week) })),
        places,
      );
    },

    /** The weeks and units students can't see, by folder, whether or not the course has a calendar (STU-0218). */
    async hiddenFromStudents(): Promise<string[]> {
      return hiddenIn((await readText(PROPERTIES)) ?? "");
    },

    /**
     * The plan that keeps a week hidden until a day, beside the ignore list in properties.yaml, or takes its
     * date away (STU-0197). Only a week or unit at the top of the course can be hidden in Tutors.
     */
    async planRelease(folder: string, date: string | null): Promise<ArrangePlan> {
      if (date !== null && !isDate(date)) return { ok: false, message: `"${date}" is not a date. Give the day students should see it, such as 2027-02-22.` };
      const tree = await rules.buildTree(fs);
      const place = topLevel(tree).find((candidate) => candidate.path === folder);
      if (place === undefined) {
        const hide = await rules.rewire(fs, { action: "hide", item: folder, hidden: true });
        return { ok: false, message: hide.ok ? `Studio can't find "${folder}" at the top of this course.` : hide.reason };
      }
      let properties = (await readText(PROPERTIES)) ?? "";
      if (date !== null) {
        // Kept from students until the day: hidden as well as dated.
        const hide = await rules.rewire(fs, { action: "hide", item: folder, hidden: true });
        if (!hide.ok) return { ok: false, message: hide.reason };
        const write = hide.ops.find((op): op is Extract<FileOp, { op: "write" }> => op.op === "write" && op.path === PROPERTIES);
        if (write) properties = decode(write.content);
      }
      const next = withRelease(properties, folder, date);
      if (next === ((await readText(PROPERTIES)) ?? "")) return { ok: false, message: "That is already how the course is." };
      const summary = date === null ? `Take the release date off "${titleOf(place)}"` : `Hide "${titleOf(place)}" from students until ${readableDate(date)}`;
      return { ok: true, plan: { id: deps.newId(), summary, ops: [{ op: "write", path: PROPERTIES, content: encode(next) }] }, notes: [], select: folder };
    },

    /** The plan that shows a due week to students; publishing it is the next press (STU-0198). */
    async planShowDue(folder: string): Promise<ArrangePlan> {
      const properties = (await readText(PROPERTIES)) ?? "";
      const release = releasesIn(properties)[folder];
      const place = topLevel(await rules.buildTree(fs)).find((candidate) => candidate.path === folder);
      if (place === undefined || release === undefined || release > today() || !hiddenIn(properties).includes(folder))
        return { ok: false, message: "That week isn't due out yet." };
      const shown = await rules.rewire(fs, { action: "hide", item: folder, hidden: false });
      if (!shown.ok) return { ok: false, message: shown.reason };
      return {
        ok: true,
        plan: { id: deps.newId(), summary: `Show "${titleOf(place)}" to students`, ops: shown.ops },
        notes: [dueWords(titleOf(place), release, today()), "Publish the course after this, and students see it."],
        select: folder,
      };
    },
  };
}

/** Next year's course from this one: what the lecturer gives, a new name and the first Monday of teaching. */
export interface RollOverAnswers {
  name: string;
  /** Any day in the first week; the calendar starts on its Monday. Null keeps the course undated. */
  start: string | null;
}

export type RollOverResult = { ok: true; folder: string; fs: FileSystemPort } | { ok: false; reason: string };

/** A course page with its title (the first heading after any front matter) set to `title`. */
function retitled(markdown: string, title: string): string {
  const front = /^﻿?---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n/.exec(markdown)?.[0] ?? "";
  const body = markdown.slice(front.length);
  const lines = body.split("\n");
  const at = lines.findIndex((line) => line.trim() !== "");
  if (at === -1) return `${front}# ${title}\n`;
  lines[at] = `# ${title}`;
  return front + lines.join("\n");
}

/**
 * The plan for next year's copy (STU-0199): every file the course holds but its built output, its bin and
 * git, with the release dates cleared, the title changed and the calendar dated from the new Monday.
 */
export async function planRollOver(
  rules: CourseRulesPort,
  source: FileSystemPort,
  answers: RollOverAnswers,
  newId: () => string,
): Promise<{ ok: true; folder: string; plan: Plan } | { ok: false; reason: string }> {
  const name = answers.name.replace(/\s+/g, " ").trim();
  const folder = courseFolderName({ name });
  if (folder === "") return { ok: false, reason: "Give next year's course a name with at least one letter or number." };
  if (answers.start !== null && !isDate(answers.start)) return { ok: false, reason: `"${answers.start}" is not a date. Give the first day of teaching, such as 2027-09-13.` };
  const ops: FileOp[] = [];
  const walk = async (dir: string): Promise<void> => {
    for (const entry of await source.list(dir)) {
      const path = joined(dir, entry.name);
      if (!keptOnRollOver(entry.kind === "dir" ? `${path}/` : path)) continue;
      if (entry.kind === "dir") await walk(path);
      else ops.push({ op: "write", path, content: await source.read(path) });
    }
  };
  await walk("");
  const rewrite = (path: string, change: (text: string) => string) => {
    const op = ops.find((candidate): candidate is Extract<FileOp, { op: "write" }> => candidate.op === "write" && candidate.path === path);
    if (op) op.content = encode(change(decode(op.content)));
  };
  rewrite(PROPERTIES, withoutReleases);
  rewrite("course.md", (text) => retitled(text, name));
  if (answers.start !== null) {
    const weeks = weeksIn(await rules.buildTree(source)).length;
    const calendar = encode(rules.calendar(name, weeks, mondayOf(answers.start)));
    const existing = ops.find((op) => op.op === "write" && op.path === CALENDAR);
    if (existing && existing.op === "write") existing.content = calendar;
    else if (weeks > 0) ops.push({ op: "write", path: CALENDAR, content: calendar });
  }
  const dated = answers.start === null ? "" : `, dated from ${readableDate(mondayOf(answers.start))}`;
  return { ok: true, folder, plan: { id: newId(), summary: `Start ${name} from this course${dated}`, ops } };
}

/** Makes next year's course in a new folder and applies the plan whole; nothing in this course changes. */
export async function createRollOver(deps: NewCourseDeps, source: FileSystemPort, answers: RollOverAnswers): Promise<RollOverResult> {
  const planned = await planRollOver(deps.rules, source, answers, deps.newId);
  if (!planned.ok) return planned;
  let made: FileSystemPort;
  try {
    made = await deps.makeFolder(planned.folder);
  } catch (error) {
    return { ok: false, reason: `Nothing was created: ${error instanceof Error ? error.message : String(error)}` };
  }
  const applied = await applyPlan(made, planned.plan);
  if (!applied.ok) return { ok: false, reason: `Next year's course wasn't made: ${applied.blockedBy} (${applied.reason})` };
  return { ok: true, folder: planned.folder, fs: made };
}
