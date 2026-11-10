import type { CourseFolder } from "../../domain/course-map.ts";
import type { Finding } from "../../domain/finding.ts";
import type { CourseAnswers } from "../../domain/new-course.ts";
import type { QuizForm } from "../../domain/quiz.ts";
import type { MaterialShape, TrayFile } from "../../domain/material.ts";
import type { ArrangeAction } from "../../domain/arrange.ts";
import type { FileOp } from "../../domain/plan.ts";
import type { FileSystemPort } from "./file-system.ts";

/** A rewiring plan from course-rules: the ops to accept, with sentences to read first; or why there is none. */
export type Rewiring = { ok: true; ops: FileOp[]; notes: string[] } | { ok: false; reason: string };

/** The ways course-rules rewires a course and keeps it compliant (upstream feature 15). Each plans and never writes. */
export type RewireAction = ArrangeAction;

/** Driven port: @tutors/course-rules, pinned (ADR 0003). A fake with canned findings drives UI tests. */
export interface CourseRulesPort {
  /** The version of the rules in use, shown in Settings and in bug reports. */
  readonly version: string;
  buildTree(fs: FileSystemPort): Promise<CourseFolder>;
  /** Every finding course-rules makes of the course. */
  validate(fs: FileSystemPort): Promise<Finding[]>;
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
  /**
   * Every file of a new course from checked answers: the files `tutors create --pattern` writes for that week,
   * with no calendar and no dates. Pure.
   */
  newCourseFiles(answers: CourseAnswers): { path: string; content: string }[];
  /**
   * Plans a rewiring with course-rules' own planners: reorder items of one kind, move an item, give it a
   * new title, hide or show a top-level week, remove it to the bin or put it back. Reads only.
   */
  rewire(fs: FileSystemPort, action: RewireAction): Promise<Rewiring>;
  /** The page a folder's card takes its title and settings from (course.md, topic.md, a lab's first step ...), as the generator picks it. Pure. */
  descriptorOf(folder: CourseFolder): string | undefined;
  /** The calendar.yaml `tutors create` writes for a course of so many weeks starting on a date (YYYY-MM-DD). Pure. */
  calendar(courseName: string, weeks: number, start: string): string;
}
