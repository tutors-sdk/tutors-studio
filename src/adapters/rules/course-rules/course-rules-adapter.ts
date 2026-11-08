import { buildCourseTree, mermaidBlocks, messages, proposeShape, titleOf, validate, type CourseNode, type ImportFile, type ShapeItem } from "@tutors/course-rules";
import { diagnoseQuiz, extractQuizBlock, parseQuizMarkdown, QuizDraftError, writeQuizPage } from "@tutors/course-rules/quiz";
import courseRulesManifest from "@tutors/course-rules/deno.json";
import { defaultSpec, generateCourseFiles, patterns, slugify } from "@tutors/tutors-create/generate";
import { importLayout } from "@tutors/tutors-create/import";
import type { MaterialItem, MaterialShape } from "../../../domain/material.ts";
import { labelFor, type CourseFolder } from "../../../domain/course-map.ts";
import type { CourseAnswers, PatternCard } from "../../../domain/new-course.ts";
import type { QuizForm } from "../../../domain/quiz.ts";
import type { CourseRulesPort } from "../../../application/ports/course-rules.ts";
import type { DiagramPort } from "../../../application/ports/diagrams.ts";
import type { FileSystemPort } from "../../../application/ports/file-system.ts";

const LAB_STEP = /^(\d{2})\.[^.].*\.md$/;

/** The .md file whose first line is the card's title, picked as the generator picks it (course-rules' V008 reads the same file). */
function descriptorOf(node: CourseNode): string | undefined {
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

const card = (item: { kind: string; title: string }) => ({ label: labelFor(item.kind)!, title: item.title });

/**
 * @tutors/course-rules, and the tutors-create generator it pairs with, behind CourseRulesPort. The only
 * file in Studio that imports either (ADR 0003).
 */
export const courseRules: CourseRulesPort = {
  version: courseRulesManifest.version,
  async buildTree(fs: FileSystemPort) {
    return toFolder(await buildCourseTree(fs), fs);
  },
  validate(fs: FileSystemPort, diagrams?: DiagramPort) {
    return validate(fs, "", diagrams === undefined ? {} : { diagrams: { mermaid: (source) => diagrams.check(source) } });
  },
  diagramsIn(text: string) {
    return mermaidBlocks(text);
  },
  readQuiz,
  writeQuiz,
  shapeMaterial,
  patterns(): PatternCard[] {
    return patterns.map((p) => ({ id: p.id, name: p.name, description: p.description, pickedWhen: p.pickedWhen, week: p.week.map(card), side: p.side.map(card) }));
  },
  newCourseFiles(answers: CourseAnswers) {
    const spec = {
      ...defaultSpec,
      courseName: answers.name.trim(),
      lecturerName: answers.lecturer.trim(),
      courseId: slugify(answers.name),
      pattern: { id: answers.pattern, weeks: answers.weeks, start: answers.start, ...(answers.readingWeek === null ? {} : { readingWeek: answers.readingWeek }) },
    };
    return generateCourseFiles(spec).map((file) => ({ path: file.relativePath, content: file.content }));
  },
};
