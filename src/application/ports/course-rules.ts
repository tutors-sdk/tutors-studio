import type { CourseFolder } from "../../domain/course-map.ts";
import type { Finding } from "../../domain/finding.ts";
import type { CourseAnswers, PatternCard } from "../../domain/new-course.ts";
import type { QuizForm } from "../../domain/quiz.ts";
import type { MaterialShape, TrayFile } from "../../domain/material.ts";
import type { DiagramPort } from "./diagrams.ts";
import type { FileSystemPort } from "./file-system.ts";

/** Driven port: @tutors/course-rules, pinned (ADR 0003). A fake with canned findings drives UI tests. */
export interface CourseRulesPort {
  /** The version of the rules in use, shown in Settings and in bug reports. */
  readonly version: string;
  buildTree(fs: FileSystemPort): Promise<CourseFolder>;
  /** Every finding; Mermaid diagrams are checked (V017) only when a DiagramPort is given. */
  validate(fs: FileSystemPort, diagrams?: DiagramPort): Promise<Finding[]>;
  /** The fenced Mermaid diagrams in a page or deck, with the line each one's source starts on. Pure. */
  diagramsIn(text: string): { source: string; line: number }[];
  /**
   * A quiz page read into the designer's form, with course-rules' sentence for each question the reader
   * leaves out (and the form leaves out too). A page with no quiz block gives a form with no questions. Pure.
   */
  readQuiz(markdown: string): { form: QuizForm; leftOut: string[] };
  /** The quiz page the reader would show as the form reads, or course-rules' sentence for what stops it. Pure. */
  writeQuiz(form: QuizForm): { ok: true; markdown: string } | { ok: false; message: string };
  /**
   * What dropped material becomes, by course-rules' shape from content laid out as tutors-create imports
   * it: a PDF a talk, a .md or Word file a note, a .zip an archive, a link file a web link, a folder of
   * numbered steps a lab. `text` is given for small link files. On a topic, weeks are ignored. Pure.
   */
  shapeMaterial(files: readonly { path: string; text?: string }[], onTopic: boolean): MaterialShape;
  /**
   * A whole new course from a folder of the lecturer's own material, laid out as `tutors import` lays it
   * out: the course's root files, a topic for each week the names give, and each recognised file copied
   * into its own learning object. What it can't place is in the tray. Pure.
   */
  importCourse(
    course: { name: string; lecturer: string; start: string | null },
    files: readonly { path: string; text?: string }[],
  ): { files: { path: string; content: string }[]; copies: { from: string; to: string }[]; weeks: number; items: number; tray: TrayFile[] };
  /** Whether a page still holds starter text a new course is made with, so the lecturer hasn't written it yet. Pure. */
  hasStarterText(markdown: string): boolean;
  /** The teaching patterns, in the order the cards are shown. */
  patterns(): PatternCard[];
  /** Every file of a new course from checked answers: the files `tutors create --pattern` writes. Pure. */
  newCourseFiles(answers: CourseAnswers): { path: string; content: string }[];
}
