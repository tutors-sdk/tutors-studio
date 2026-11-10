import {
  buildCourseTree,
  messages,
  planBin,
  planHide,
  planMove,
  planReorder,
  planRestore,
  planRetitle,
  proposeShape,
  titleOf,
  validate,
  type CourseNode,
  type FileOp as RulesOp,
  type ImportFile,
  type RewirePlan,
  type ShapeItem,
} from "@tutors/course-rules";
import { diagnoseQuiz, extractQuizBlock, parseQuizMarkdown, QuizDraftError, writeQuizPage } from "@tutors/course-rules/quiz";
import courseRulesManifest from "@tutors/course-rules/deno.json";
import { defaultSpec, generateCourseFiles, patterns, slugify } from "@tutors/tutors-create/generate";
import { importLayout } from "@tutors/tutors-create/import";
import type { MaterialItem, MaterialShape } from "../../../domain/material.ts";
import { labelFor, type CourseFolder } from "../../../domain/course-map.ts";
import { weekItems, type CourseAnswers } from "../../../domain/new-course.ts";
import type { QuizForm } from "../../../domain/quiz.ts";
import type { CourseRulesPort, RewireAction, Rewiring } from "../../../application/ports/course-rules.ts";
import type { FileOp } from "../../../domain/plan.ts";
import type { FileSystemPort } from "../../../application/ports/file-system.ts";

const LAB_STEP = /^(\d{2})\.[^.].*\.md$/;

/** The .md file whose first line is the card's title, picked as the generator picks it (course-rules' V008 reads the same file). */
function descriptorOf(node: Pick<CourseNode, "kind"> & { files: readonly { name: string; path: string }[] }): string | undefined {
  const md = node.files.filter((file) => file.name.toLowerCase().endsWith(".md"));
  if (node.kind === null) return undefined;
  if (node.kind === "course") return md.find((file) => file.name === "course.md")?.path;
  if (node.kind === "lab") return md.find((file) => LAB_STEP.test(file.name))?.path;
  return md[0]?.path;
}

async function toFolder(node: CourseNode, fs: FileSystemPort): Promise<CourseFolder> {
  const descriptor = descriptorOf(node);
  let title: string | null = null;
  if (descriptor !== undefined) {
    try {
      title = titleOf(new TextDecoder().decode(await fs.read(descriptor))) || null;
    } catch {
      title = null;
    }
  }
  return {
    name: node.name,
    path: node.path,
    kind: node.kind,
    title,
    files: node.files.map((file) => ({ name: file.name, path: file.path })),
    children: await Promise.all(node.children.map((child) => toFolder(child, fs))),
  };
}

const ITEM_DIR = "unit-1/topic-01/";

/** One shaped item laid out by tutors-create's import, with its paths made relative to the item's own folder. */
function layoutOf(item: ShapeItem, week: number | null): MaterialItem {
  const layout = importLayout(defaultSpec, { topics: [{ week: 1, items: [item] }], tray: [] });
  const folder = `${ITEM_DIR}${item.kind}-01/`;
  return {
    kind: item.kind,
    title: item.title,
    week,
    writes: layout.files.filter((file) => file.relativePath.startsWith(folder)).map((file) => ({ path: file.relativePath.slice(folder.length), content: file.content })),
    copies: layout.copies.filter((copy) => copy.to.startsWith(folder)).map((copy) => ({ from: copy.from, to: copy.to.slice(folder.length) })),
  };
}

/**
 * Shape from content over dropped files. On a topic every recognised file is placed, whatever week its
 * name gives (each path is read as if inside a "week-1" folder so a lab folder is still one lab); on the
 * course the weeks come from the names.
 */
function shapeMaterial(files: readonly ImportFile[], onTopic: boolean): MaterialShape {
  const PREFIX = "week-1/";
  const given = onTopic ? files.map((file) => ({ ...file, path: `${PREFIX}${file.path}` })) : [...files];
  const original = (path: string) => (onTopic ? path.slice(PREFIX.length) : path);
  const proposal = proposeShape(given);
  const unprefix = (item: ShapeItem): ShapeItem => ({ ...item, files: item.files.map(original) });
  const items = proposal.topics.flatMap((topic) => topic.items.map((item) => layoutOf(unprefix(item), onTopic ? null : topic.week)));
  const tray = proposal.tray.map(original).map((path) => {
    const file = files.find((candidate) => candidate.path === path);
    const known = file !== undefined && proposeShape([{ ...file, path: `${PREFIX}${path.slice(path.lastIndexOf("/") + 1)}` }]).topics.length > 0;
    return { path, reason: known && !onTopic ? ("no-week" as const) : ("unknown-kind" as const) };
  });
  return { items, tray };
}

/** A page's prose split into its first # heading and everything else, which the designer calls the introduction. */
function headingAndIntroduction(prose: string): { heading: string; introduction: string } {
  const lines = prose.split("\n");
  const at = lines.findIndex((line) => /^#\s/.test(line));
  if (at === -1) return { heading: "", introduction: prose.trim() };
  return {
    heading: lines[at].replace(/^#\s+/, "").trim(),
    introduction: lines
      .filter((_, index) => index !== at)
      .join("\n")
      .trim(),
  };
}

function readQuiz(markdown: string): { form: QuizForm; leftOut: string[] } {
  const text = markdown.replace(/\r\n?/g, "\n");
  const { prose, quizSource } = extractQuizBlock(text);
  const parsed = quizSource === null ? null : parseQuizMarkdown(quizSource);
  const leftOut = diagnoseQuiz(text).flatMap((d) => (d.kind === "question" ? [messages.quizQuestion(d.number, d.excerpt, d.problem, d.optionCount, d.answer)] : []));
  return {
    form: {
      ...headingAndIntroduction(prose),
      timeLimit: parsed?.timeLimit ?? null,
      blockTitle: parsed?.title ?? null,
      questions: (parsed?.questions ?? []).map((q) => ({ kind: q.type, text: q.text, answers: q.options, right: q.correctIndex })),
    },
    leftOut,
  };
}

function writeQuiz(form: QuizForm): { ok: true; markdown: string } | { ok: false; message: string } {
  const draft = {
    title: form.blockTitle,
    timeLimit: form.timeLimit,
    questions: form.questions.map((q) => ({ type: q.kind, text: q.text, options: q.answers, correctIndex: q.right })),
  };
  try {
    return { ok: true, markdown: writeQuizPage(form.heading, form.introduction, draft) };
  } catch (error) {
    if (error instanceof QuizDraftError) return { ok: false, message: messages.quizDraft(error.question, error.problem) };
    throw error;
  }
}

/** The date the generator is given; nothing dated survives into the course (see newCourseFiles). */
const UNDATED = "2001-01-01";

/**
 * A generated file with its dates taken out: a topic's "Week of 1 January 2001." line, and the pattern's name
 * on a unit ("Lecture and lab, weeks 1–4."), which means nothing to a lecturer who never chose a pattern.
 */
function undated(path: string, content: string, patternName: string): string {
  if (/\/topic-\d+\/topic\.md$/.test(path)) return content.replace(/\n\nWeek of [^\n]*\.\n/, "\n\nThis week's lectures, labs and readings.\n");
  if (/^unit-\d+\/unit\.md$/.test(path)) return content.replace(`${patternName}, w`, "W");
  return content;
}

const NAME = "Studio Course Name";
const LECTURER = "Studio Lecturer";
const MONTHS = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/g;
const escape = (line: string) => line.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Each sentence of starter text tutors-create writes into a new course's pages, as a pattern for one
 * whole line: any course name, lecturer, number and month. Headings and settings are left out, since the
 * lecturer keeps those; so are short lines, which a lecturer could write too.
 */
const starterLines: RegExp[] = (() => {
  const lines = new Set<string>();
  for (const pattern of patterns)
    for (const lecturerName of [LECTURER, ""])
      for (const file of generateCourseFiles({ ...defaultSpec, courseName: NAME, lecturerName, courseId: "starter", pattern: { id: pattern.id, weeks: 2, start: "2027-01-04" } }))
        if (file.relativePath.endsWith(".md")) for (const line of undated(file.relativePath, file.content, pattern.name).split("\n")) lines.add(line.trim());
  return [...lines]
    .filter((line) => line.length >= 24 && !/^(#|---|icon:|type:)/.test(line))
    .map((line) => new RegExp(`^${escape(line).replaceAll(NAME, ".+").replaceAll(LECTURER, ".+").replace(/\d+/g, "\\d+").replace(MONTHS, "[A-Z][a-z]+")}$`));
})();

function hasStarterText(markdown: string): boolean {
  return markdown.split(/\r?\n/).some((line) => starterLines.some((starter) => starter.test(line.trim())));
}

/**
 * @tutors/course-rules, and the tutors-create generator it pairs with, behind CourseRulesPort. The only
 * file in Studio that imports either (ADR 0003).
 */
export const courseRules: CourseRulesPort = {
  version: courseRulesManifest.version,
  async buildTree(fs: FileSystemPort) {
    return toFolder(await buildCourseTree(fs), fs);
  },
  validate(fs: FileSystemPort) {
    return validate(fs, "", {});
  },
  readQuiz,
  writeQuiz,
  hasStarterText,
  shapeMaterial,
  importCourse(course, files) {
    const proposal = proposeShape(files);
    const spec = { ...defaultSpec, courseName: course.name.trim(), lecturerName: course.lecturer.trim(), courseId: slugify(course.name) };
    const layout = importLayout(spec, proposal, course.start === null ? {} : { start: course.start });
    const tray = proposal.tray.map((path) => {
      const file = files.find((candidate) => candidate.path === path);
      const known = file !== undefined && proposeShape([{ ...file, path: `week-1/${path.slice(path.lastIndexOf("/") + 1)}` }]).topics.length > 0;
      return { path, reason: known ? ("no-week" as const) : ("unknown-kind" as const) };
    });
    return {
      files: layout.files.map((file) => ({ path: file.relativePath, content: file.content })),
      copies: layout.copies,
      weeks: Math.max(0, ...proposal.topics.map((topic) => topic.week)),
      items: proposal.topics.reduce((sum, topic) => sum + topic.items.length, 0),
      tray,
    };
  },
  newCourseFiles(answers: CourseAnswers) {
    // The side unit: a project's specification and starter code, or else the module handbook and an introduction.
    const pattern = patterns.find((candidate) => candidate.id === (answers.project ? "project-based" : "lecture-lab"))!;
    const spec = {
      ...defaultSpec,
      courseName: answers.name.trim(),
      lecturerName: answers.lecturer.trim(),
      courseId: slugify(answers.name),
      pattern: { id: pattern.id, weeks: answers.weeks, start: UNDATED, week: weekItems(answers.shape) },
    };
    // No calendar: a new course starts undated (Leigh, 2026-11-09), and the lecturer adds dates when they have them.
    return generateCourseFiles(spec)
      .filter((file) => file.relativePath !== "calendar.yaml")
      .map((file) => ({ path: file.relativePath, content: undated(file.relativePath, file.content, pattern.name) }));
  },
  async rewire(fs: FileSystemPort, action: RewireAction): Promise<Rewiring> {
    return asStudioPlan(await planned(fs, action));
  },
  descriptorOf,
  calendar(courseName: string, weeks: number, start: string) {
    const spec = { ...defaultSpec, courseName: courseName.trim(), courseId: slugify(courseName), pattern: { id: "lecture-lab", weeks, start } };
    return generateCourseFiles(spec).find((file) => file.relativePath === "calendar.yaml")!.content;
  },
};

const planned = (fs: FileSystemPort, action: RewireAction): Promise<RewirePlan> => {
  switch (action.action) {
    case "reorder":
      return planReorder(fs, action.folder, action.order);
    case "move":
      return planMove(fs, action.item, action.into);
    case "retitle":
      return planRetitle(fs, action.item, action.title);
    case "hide":
      return planHide(fs, action.item, action.hidden);
    case "remove":
      return planBin(fs, action.item);
    case "restore":
      return planRestore(fs, action.name, action.into);
  }
};

/** course-rules' ops in Studio's shape: a write's text as bytes. Studio's writes always replace, so `replace` needs no flag. */
const asStudioOp = (op: RulesOp): FileOp => (op.op === "move" ? op : { op: "write", path: op.path, content: new TextEncoder().encode(op.content) });
const asStudioPlan = (plan: RewirePlan): Rewiring => (plan.ok ? { ok: true, ops: plan.ops.map(asStudioOp), notes: plan.notes } : plan);
