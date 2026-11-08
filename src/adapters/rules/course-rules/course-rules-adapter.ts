import { buildCourseTree, mermaidBlocks, messages, validate, type CourseNode } from "@tutors/course-rules";
import { diagnoseQuiz, extractQuizBlock, parseQuizMarkdown, QuizDraftError, writeQuizPage } from "@tutors/course-rules/quiz";
import courseRulesManifest from "@tutors/course-rules/deno.json";
import { defaultSpec, generateCourseFiles, patterns, slugify } from "@tutors/tutors-create/generate";
import { labelFor, type CourseFolder } from "../../../domain/course-map.ts";
import type { CourseAnswers, PatternCard } from "../../../domain/new-course.ts";
import type { QuizForm } from "../../../domain/quiz.ts";
import type { CourseRulesPort } from "../../../application/ports/course-rules.ts";
import type { DiagramPort } from "../../../application/ports/diagrams.ts";
import type { FileSystemPort } from "../../../application/ports/file-system.ts";

const toFolder = (node: CourseNode): CourseFolder => ({
  name: node.name,
  path: node.path,
  kind: node.kind,
  files: node.files.map((file) => ({ name: file.name, path: file.path })),
  children: node.children.map(toFolder),
});

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
    return toFolder(await buildCourseTree(fs));
  },
  validate(fs: FileSystemPort, diagrams?: DiagramPort) {
    return validate(fs, "", diagrams === undefined ? {} : { diagrams: { mermaid: (source) => diagrams.check(source) } });
  },
  diagramsIn(text: string) {
    return mermaidBlocks(text);
  },
  readQuiz,
  writeQuiz,
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
