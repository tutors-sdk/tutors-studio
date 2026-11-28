import { findFolder } from "../../domain/arrange.ts";
import { attachmentFor, attachmentName, placedForTutors, relinked } from "../../domain/attachments.ts";
import { buildCourseMap, type CourseFolder, type MapNode } from "../../domain/course-map.ts";
import { isPicture } from "../../domain/course-details.ts";
import { guideWeeks, guidedKinds, STARTER_DECK_LINE, startingWeekTitle, uploadFor, uploadWords, type GuideWeek } from "../../domain/guided.ts";
import { BIN_FOLDER, binName } from "../../domain/history.ts";
import { isStep, stepFileFor, stepsOf } from "../../domain/lab-steps.ts";
import type { DroppedFile } from "../../domain/material.ts";
import type { FileOp } from "../../domain/plan.ts";
import { hasTemplateStarterText } from "../../domain/templates.ts";
import { zipStored } from "../../domain/zip.ts";
import type { ArrangePlan } from "../ports/authoring.ts";
import type { CourseRulesPort } from "../ports/course-rules.ts";
import type { FileSystemPort } from "../ports/file-system.ts";

const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
const encode = (text: string) => new TextEncoder().encode(text);
const baseOf = (path: string) => path.slice(path.lastIndexOf("/") + 1);
const extensionOf = (name: string) => (name.lastIndexOf(".") > 0 ? name.slice(name.lastIndexOf(".") + 1).toLowerCase() : "");
const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
const SLIDE_KINDS = ["talk", "paneltalk", "tutorial"];

/** A page's title: its first # heading, else its file name without step numbers or extension ("01 Setup.md" is "Setup"). */
function pageTitle(path: string, markdown: string): string {
  const heading = /^#\s+(.+)$/m.exec(markdown)?.[1]?.trim();
  if (heading) return heading;
  return (
    baseOf(path)
      .replace(/\.md$/i, "")
      .replace(/^[\d\s._-]+/, "")
      .replace(/[-_]+/g, " ")
      .trim() || "Step"
  );
}

/** The front matter a page starts with (its card's icon), or nothing. */
const frontMatter = (markdown: string) => /^---\r?\n[\s\S]*?\r?\n---\r?\n/.exec(markdown)?.[0] ?? "";

/**
 * Guided building (ADR 0071): the contextual upload each item offers, planned like every other change
 * (ADR 0004), and the guide's track through a course, read from the course itself so it picks up where
 * the lecturer left it.
 */
export function guidedUseCases(deps: { fs: FileSystemPort; rules: CourseRulesPort; newId: () => string }) {
  const { fs, rules } = deps;
  const unwritten = (markdown: string) => rules.hasStarterText(markdown) || hasTemplateStarterText(markdown);
  const refuse = (message: string): ArrangePlan => ({ ok: false, message });
  const namesIn = async (folder: string) => ((await fs.exists(folder)) ? (await fs.list(folder)).map((entry) => entry.name) : []);
  const filesIn = async (folder: string) => (await fs.list(folder)).filter((entry) => entry.kind === "file").map((entry) => entry.name);

  /** Moves to the bin for each file, under names the bin hasn't got yet. */
  const toBin = async (folder: string, names: readonly string[]): Promise<FileOp[]> => {
    const taken = new Set(await namesIn(BIN_FOLDER));
    return names.map((name) => {
      const to = binName(name, taken);
      taken.add(to);
      return { op: "move", from: `${folder}/${name}`, to: `${BIN_FOLDER}/${to}` };
    });
  };

  /** Whether an item already holds the lecturer's material, by its kind. Reads only. */
  async function hasMaterial(folder: CourseFolder): Promise<boolean> {
    const names = folder.files.map((file) => file.name);
    if (SLIDE_KINDS.includes(folder.kind ?? "")) {
      if (names.some((name) => extensionOf(name) === "pdf" || name === "videoid")) return true;
      for (const deck of names.filter((name) => extensionOf(name) === "marp")) if (!decode(await fs.read(`${folder.path}/${deck}`)).includes(STARTER_DECK_LINE)) return true;
      return false;
    }
    if (folder.kind === "archive") return names.some((name) => extensionOf(name) === "zip");
    const pages = folder.kind === "lab" ? names.filter(isStep) : names.filter((name) => extensionOf(name) === "md");
    if (pages.length === 0) return false;
    for (const page of pages) if (unwritten(decode(await fs.read(`${folder.path}/${page}`)))) return false;
    return true;
  }

  async function planSlides(folder: CourseFolder, title: string, files: DroppedFile[], what: string): Promise<ArrangePlan> {
    if (files.length !== 1) return refuse(uploadWords.onePdf);
    const name = attachmentName(baseOf(files[0].path));
    if (extensionOf(name) !== "pdf") return refuse(uploadWords.notPdf(baseOf(files[0].path)));
    const old = folder.files.map((file) => file.name).filter((existing) => ["pdf", "marp"].includes(extensionOf(existing)));
    const ops = [...(await toBin(folder.path, old)), { op: "write" as const, path: `${folder.path}/${name}`, content: files[0].bytes }];
    const notes =
      old.length === 0 ? [] : [`${old.length === 1 ? `Its ${what} now, ${old[0]},` : `The ${old.length} files it shows now`} go${old.length === 1 ? "es" : ""} to the bin.`];
    return { ok: true, plan: { id: deps.newId(), summary: `Add ${name} to "${title}"`, ops }, notes, select: folder.path };
  }

  async function planArchive(folder: CourseFolder, title: string, files: DroppedFile[]): Promise<ArrangePlan> {
    if (files.length !== 1) return refuse(uploadWords.oneFile);
    const name = attachmentName(baseOf(files[0].path));
    const zipped = extensionOf(name) === "zip";
    const stored = zipped ? name : `${name}.zip`;
    const old = folder.files.map((file) => file.name).filter((existing) => extensionOf(existing) === "zip");
    const ops: FileOp[] = [
      ...(await toBin(folder.path, old)),
      { op: "write", path: `${folder.path}/${stored}`, content: zipped ? files[0].bytes : zipStored([{ name, bytes: files[0].bytes }]) },
    ];
    const notes = [
      ...(zipped ? [] : [`Studio zips ${name} as ${stored}, so students can download it.`]),
      ...(old.length === 0 ? [] : [`The download it has now, ${old.join(", ")}, goes to the bin.`]),
    ];
    return { ok: true, plan: { id: deps.newId(), summary: `Add ${stored} to "${title}"`, ops }, notes, select: folder.path };
  }

  async function planLab(folder: CourseFolder, title: string, files: DroppedFile[]): Promise<ArrangePlan> {
    const pages = files.filter((file) => extensionOf(file.path) === "md").sort((a, b) => a.path.localeCompare(b.path));
    const others = files.filter((file) => extensionOf(file.path) !== "md");
    const names = await filesIn(folder.path);
    const steps = stepsOf(names);
    // Steps that still hold the text Studio started them with make way for the lecturer's own.
    const starters = pages.length > 0 && (await Promise.all(steps.map(async (step) => unwritten(decode(await fs.read(`${folder.path}/${step.file}`)))))).every(Boolean);
    const kept = starters ? [] : steps;
    let number = kept.length === 0 ? 1 : kept[kept.length - 1].number + 1;
    const ops: FileOp[] = starters
      ? await toBin(
          folder.path,
          steps.map((step) => step.file),
        )
      : [];
    const taken = new Set(names.filter((name) => !(starters && isStep(name))));
    const free = (name: string) => {
      const dot = name.lastIndexOf(".");
      const [stem, extension] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ""];
      let candidate = name;
      for (let n = 2; taken.has(candidate); n++) candidate = `${stem}-${n}${extension}`;
      taken.add(candidate);
      return candidate;
    };
    // Every other file goes beside the steps under a clean name; the steps' links follow it, and
    // placedForTutors then moves all but the pictures into the lab's archives/ (ADR 0040).
    const renames = others.map((file) => ({ file, from: baseOf(file.path), to: free(attachmentName(baseOf(file.path))) }));
    for (const page of pages) {
      const markdown = decode(page.bytes);
      const stepTitle = pageTitle(page.path, markdown);
      const text = renames.reduce((body, move) => (move.from === move.to ? body : relinked(body, move.from, move.to)), markdown);
      ops.push({ op: "write", path: `${folder.path}/${free(stepFileFor(number++, stepTitle))}`, content: encode(/^#\s/m.test(text) ? text : `# ${stepTitle}\n\n${text}`) });
    }
    for (const move of renames) ops.push({ op: "write", path: `${folder.path}/${move.to}`, content: move.file.bytes });
    const what = [...(pages.length > 0 ? [plural(pages.length, "step")] : []), ...(others.length > 0 ? [plural(others.length, "file")] : [])].join(" and ");
    const notes = [
      ...(starters && steps.length > 0 ? [`The steps it started with go to the bin, and yours take their place.`] : []),
      ...(others.some((file) => !isPicture(baseOf(file.path))) ? ["Handouts, data and code go in the lab's archives folder, and the steps' links point there."] : []),
    ];
    return { ok: true, plan: { id: deps.newId(), summary: `Add ${what} to "${title}"`, ops: placedForTutors(ops) }, notes, select: folder.path };
  }

  async function planNote(folder: CourseFolder, title: string, files: DroppedFile[]): Promise<ArrangePlan> {
    const pages = files.filter((file) => extensionOf(file.path) === "md");
    if (pages.length > 1) return refuse(uploadWords.twoPages);
    const others = files.filter((file) => extensionOf(file.path) !== "md");
    const names = await filesIn(folder.path);
    const page = names.filter((name) => extensionOf(name) === "md").sort()[0] ?? "note.md";
    const before = names.includes(page) ? decode(await fs.read(`${folder.path}/${page}`)) : "";
    let markdown = before;
    if (pages.length === 1) {
      if (before !== "" && !unwritten(before)) return refuse(uploadWords.readingWritten);
      // The reading keeps its card's front matter (its icon) unless the page brings its own, and a title heading.
      const given = decode(pages[0].bytes);
      const top = frontMatter(given) || frontMatter(before);
      const text = given.slice(frontMatter(given).length);
      markdown = `${top}${/^#\s/m.test(text) ? text : `# ${title}\n\n${text}`}`;
    }
    const taken = new Set(await namesIn(`${folder.path}/archives`));
    const ops: FileOp[] = [];
    const links: string[] = [];
    for (const file of others) {
      const attached = attachmentFor(folder.path, file, taken);
      taken.add(baseOf(attached.path));
      ops.push({ op: "write", path: attached.path, content: attached.bytes });
      links.push(isPicture(baseOf(file.path)) ? `![${attached.label}](${attached.address})` : `[${attached.label}](${attached.address})`);
    }
    if (links.length > 0) markdown = `${markdown.replace(/\s*$/, "")}\n\n${links.join("\n\n")}\n`;
    ops.push({ op: "write", path: `${folder.path}/${page}`, content: encode(markdown) });
    const what = [...(pages.length > 0 ? ["your reading"] : []), ...(others.length > 0 ? [plural(others.length, "attached file")] : [])].join(" and ");
    const notes = others.some((file) => !["pdf", "zip", ...["png", "jpg", "jpeg", "gif", "svg"]].includes(extensionOf(file.path)))
      ? ["A file Tutors doesn't publish, such as a Word document, is zipped so students can download it."]
      : [];
    return { ok: true, plan: { id: deps.newId(), summary: `Add ${what} to "${title}"`, ops }, notes, select: folder.path };
  }

  return {
    /**
     * The plan that puts uploaded files into an item, by what its kind takes (STU-0341 to STU-0346): slides
     * into a talk, steps and their files into a lab, a reading into a note, a zip into an archive. Whatever
     * it replaces goes to the bin. Nothing is written.
     */
    async planUpload(item: string, files: DroppedFile[]): Promise<ArrangePlan> {
      const folder = findFolder(await rules.buildTree(fs), item);
      if (folder === undefined) return refuse("Studio can't find that item any more. Check the course again.");
      if (uploadFor(folder.kind) === null) return refuse(uploadWords.notHere);
      if (files.length === 0) return refuse(uploadWords.nothing);
      const empty = files.find((file) => file.bytes.length === 0);
      if (empty) return refuse(uploadWords.empty(baseOf(empty.path)));
      const title = folder.title ?? folder.name;
      if (folder.kind === "tutorial") return planSlides(folder, title, files, "problem sheet");
      if (SLIDE_KINDS.includes(folder.kind ?? "")) return planSlides(folder, title, files, "slides");
      if (folder.kind === "archive") return planArchive(folder, title, files);
      if (folder.kind === "lab") return planLab(folder, title, files);
      return planNote(folder, title, files);
    },

    /** The guide's track: each week in reading order, whether the lecturer has named it, and which of its items have material (STU-0349). Reads only. */
    async guide(): Promise<GuideWeek[]> {
      const tree = await rules.buildTree(fs);
      const done = new Map<string, boolean>();
      const visit = async (folder: CourseFolder) => {
        if ((guidedKinds as readonly string[]).includes(folder.kind ?? "")) done.set(folder.path, await hasMaterial(folder));
        for (const child of folder.children) await visit(child);
      };
      await visit(tree);
      const map: MapNode = buildCourseMap(tree, []);
      return guideWeeks(
        map,
        (node) => done.get(node.path) ?? false,
        (week) => !startingWeekTitle(week.title),
      );
    },
  };
}
