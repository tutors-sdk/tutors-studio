import { findFolder } from "../../domain/arrange.ts";
import type { CourseFolder } from "../../domain/course-map.ts";
import {
  creditsOf,
  frontMatterOf,
  hasIcon,
  isDate,
  isPicture,
  notAPicture,
  pageWithoutIcon,
  pictureName,
  startOf,
  withCredits,
  withoutIcon,
  type CardPicture,
  type CourseDetails,
} from "../../domain/course-details.ts";
import { BIN_FOLDER, binName } from "../../domain/history.ts";
import type { DroppedFile } from "../../domain/material.ts";
import type { FileOp } from "../../domain/plan.ts";
import type { ArrangePlan } from "../ports/authoring.ts";
import type { CourseRulesPort } from "../ports/course-rules.ts";
import type { FileSystemPort } from "../ports/file-system.ts";

const PROPERTIES = "properties.yaml";
const CALENDAR = "calendar.yaml";
const ALREADY = "That is already how the course is.";

const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
const encode = (text: string) => new TextEncoder().encode(text);
const joined = (folder: string, name: string) => (folder === "" ? name : `${folder}/${name}`);
const topicCount = (folder: CourseFolder): number => (folder.kind === "topic" ? 1 : 0) + folder.children.reduce((sum, child) => sum + topicCount(child), 0);

/** Course details and card pictures (feature 6): read from the course, changed only through accepted plans. */
export function courseDetailsUseCases(deps: { fs: FileSystemPort; rules: CourseRulesPort; newId: () => string }) {
  const { fs, rules } = deps;
  const readText = async (path: string) => ((await fs.exists(path)) ? decode(await fs.read(path)) : null);

  /** Where a folder's icon is set: properties.yaml for the course, else its card's page. */
  const settingsOf = (folder: CourseFolder) => (folder.path === "" ? PROPERTIES : rules.descriptorOf(folder));

  async function cardPicture(path: string): Promise<CardPicture> {
    const folder = findFolder(await rules.buildTree(fs), path);
    if (folder === undefined) return { kind: "usual" };
    const picture = folder.files.find((file) => isPicture(file.name));
    if (picture !== undefined) return { kind: "picture", name: picture.name };
    const settings = settingsOf(folder);
    const text = settings === undefined ? null : await readText(settings);
    if (text !== null && hasIcon(folder.path === "" ? text : frontMatterOf(text))) return { kind: "icon" };
    return { kind: "usual" };
  }

  async function courseDetails(): Promise<CourseDetails> {
    const tree = await rules.buildTree(fs);
    const calendar = await readText(CALENDAR);
    return {
      title: tree.title ?? "",
      credits: creditsOf((await readText(PROPERTIES)) ?? ""),
      start: calendar === null ? null : startOf(calendar),
      weeks: topicCount(tree),
    };
  }

  return {
    courseDetails,
    cardPicture,

    /** The plan that gives the course a new title, credits or start date; only what differs is written. */
    async planDetails(wanted: { title: string; credits: string; start: string | null }): Promise<ArrangePlan> {
      const now = await courseDetails();
      const ops: FileOp[] = [];
      const said: string[] = [];
      const title = wanted.title.replace(/\s+/g, " ").trim();
      if (title !== now.title.replace(/\s+/g, " ").trim()) {
        const planned = await rules.rewire(fs, { action: "retitle", item: "", title });
        if (!planned.ok) return { ok: false, message: planned.reason };
        ops.push(...planned.ops);
        said.push(`call the course "${title}"`);
      }
      if (wanted.credits.replace(/\s+/g, " ").trim() !== now.credits) {
        const properties = (await readText(PROPERTIES)) ?? "";
        ops.push({ op: "write", path: PROPERTIES, content: encode(withCredits(properties, wanted.credits)) });
        said.push(wanted.credits.trim() === "" ? "take out the credits" : `credit it to ${wanted.credits.replace(/\s+/g, " ").trim()}`);
      }
      if (wanted.start !== null && wanted.start !== now.start) {
        if (!isDate(wanted.start)) return { ok: false, message: `"${wanted.start}" is not a date. Give the day teaching starts, such as 2027-01-25.` };
        if (now.weeks === 0) return { ok: false, message: "This course has no weeks to date yet. Add a week first." };
        ops.push({ op: "write", path: CALENDAR, content: encode(rules.calendar(title || now.title, now.weeks, wanted.start)) });
        said.push(`date its ${now.weeks === 1 ? "week" : `${now.weeks} weeks`} from ${wanted.start}`);
      }
      if (ops.length === 0) return { ok: false, message: ALREADY };
      const summary = `Change the course details: ${said.join(", ")}`;
      return { ok: true, plan: { id: deps.newId(), summary, ops }, notes: [], select: "" };
    },

    /**
     * The plan that makes a file a card's picture: copied into the folder under a plain name, any picture
     * already there moved to the bin (Tutors shows the first it finds), and the icon that would show
     * instead taken out of the card's settings.
     */
    async planPicture(path: string, file: DroppedFile): Promise<ArrangePlan> {
      if (!isPicture(file.path)) return { ok: false, message: notAPicture(file.path) };
      const folder = findFolder(await rules.buildTree(fs), path);
      if (folder === undefined || (path !== "" && folder.kind === null)) return { ok: false, message: `Studio can't find "${path}" in this course.` };
      const name = pictureName(file.path);
      const ops: FileOp[] = [];
      const binned = new Set((await fs.exists(BIN_FOLDER)) ? (await fs.list(BIN_FOLDER)).map((entry) => entry.name) : []);
      for (const old of folder.files.filter((candidate) => isPicture(candidate.name))) {
        const to = binName(old.name, binned);
        binned.add(to);
        ops.push({ op: "move", from: old.path, to: `${BIN_FOLDER}/${to}` });
      }
      ops.push({ op: "write", path: joined(path, name), content: file.bytes });
      const settings = settingsOf(folder);
      const text = settings === undefined ? null : await readText(settings);
      if (settings !== undefined && text !== null) {
        const without = path === "" ? withoutIcon(text) : pageWithoutIcon(text);
        if (without !== text) ops.push({ op: "write", path: settings, content: encode(without) });
      }
      const where = path === "" ? "the course" : `"${folder.title ?? folder.name}"`;
      return { ok: true, plan: { id: deps.newId(), summary: `Show ${name} on the card for ${where}`, ops }, notes: [], select: path };
    },
  };
}
