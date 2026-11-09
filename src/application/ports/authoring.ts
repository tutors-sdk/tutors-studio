import type { MapNode } from "../../domain/course-map.ts";
import type { Finding } from "../../domain/finding.ts";
import type { Plan } from "../../domain/plan.ts";
import type { QuizForm } from "../../domain/quiz.ts";
import type { DroppedFile, TrayFile } from "../../domain/material.ts";

export interface CourseView {
  map: MapNode;
  findings: Finding[];
}

/** A quiz opened in the designer: the page it came from (null for a new quiz) and what the form leaves out. */
export interface OpenedQuiz {
  page: string | null;
  form: QuizForm;
  /** One sentence per question the reader already leaves out; saving the form drops them from the page. */
  leftOut: string[];
}

/** Where a designer's quiz goes: a new quiz folder inside a topic, or back over the page it was opened from. */
export type QuizTarget = { newIn: string } | { page: string };

export type QuizPlan = { ok: true; plan: Plan } | { ok: false; message: string };

/** What dropped material would become: the plan that places it (null when nothing can be placed), each item, and the tray. */
export interface MaterialPlan {
  plan: Plan | null;
  placed: { title: string; label: string; folder: string }[];
  tray: (TrayFile & { message: string })[];
}

/** A page opened in the markdown editor, with the text it had then, so a save can tell if it changed underneath (ADR 0025). */
/** A page in a folder: `written` is false while it still holds the starter text it was made with. */
export interface PageEntry {
  path: string;
  written: boolean;
}

export interface OpenedPage {
  path: string;
  markdown: string;
  /** Why the page can't be written plainly without losing part of it, or null when it can (ADR 0026). */
  plainProblem: string | null;
}

/** The plan that adds an item a lecturer named in their own words, and the folder it makes; or the sentence that says what to change first. */
export type ItemPlan = { ok: true; plan: Plan; folder: string } | { ok: false; message: string };

export type PagePlan = { ok: true; plan: Plan } | { ok: false; message: string };

export type ApplyResult = { ok: true } | { ok: false; blockedBy: string; reason: string };

/**
 * Driving port: everything a lecturer can do, as one facade. The UI, the headless CLI and (later) the
 * MCP server all call this, so a journey one of them drives is the journey the others drive.
 */
export interface AuthoringPort {
  /** Reads and checks the open course. */
  refresh(): Promise<CourseView>;
  /** The plan that would fix a finding, or null when the rules suggest no safe fix. Nothing is written. */
  planFix(finding: Finding): Plan | null;
  /** One plan with every safe fix the rules offer, renames deepest folder first so none moves another's path; null when there are none. */
  planFixAll(): Promise<Plan | null>;
  /** Applies an accepted plan, all of it or none of it. */
  apply(plan: Plan): Promise<ApplyResult>;
  /** The quiz in a quiz folder, read into the designer's form. Reads only. */
  openQuiz(folder: string): Promise<OpenedQuiz>;
  /** The plan that saves a designer's quiz, or the sentence that says what to change first. Nothing is written. */
  planQuiz(target: QuizTarget, form: QuizForm): Promise<QuizPlan>;
  /**
   * The plan that places dropped material: on a topic, every file Studio recognises goes into that topic;
   * on the course root ("" ), each goes to the topic for the week its name gives. The rest stays in the
   * tray. Nothing is written.
   */
  planMaterial(folder: string, dropped: DroppedFile[]): Promise<MaterialPlan>;
  /**
   * The plan that adds a new item by its plain name ("Lecture", "Lab", "Week"): Studio names the folder
   * Tutors reads (talk-02-intro) and writes its starting files. `address` is the web address a link or
   * code repository needs. Nothing is written.
   */
  planItem(folder: string, word: string, title: string, address?: string): Promise<ItemPlan>;
  /**
   * The plan that makes a folder students can't see into something they can, by its plain name ("Lab",
   * "Lecture", "Week"): Studio renames the folder to the kind Tutors reads, keeps everything inside it,
   * and adds only what that kind still needs. Nothing is written.
   */
  planVisible(folder: string, word: string): Promise<ItemPlan>;
  /** The markdown pages directly inside a folder, by name, each with whether the lecturer has written it yet. Reads only. */
  pages(folder: string): Promise<PageEntry[]>;
  /** A page's markdown, for the editor. Reads only. */
  openPage(path: string): Promise<OpenedPage>;
  /** The page's markdown as HTML for the editor's preview, with raw HTML left out. */
  renderPage(markdown: string): string;
  /** The plan that saves an edited page, or the sentence that says why it can't be saved. Nothing is written. */
  planPage(opened: OpenedPage, markdown: string): Promise<PagePlan>;
  /** A plainer explanation of a finding: the assistant's when one is bound and can answer, else the rule's own message. */
  explain(finding: Finding): Promise<Explanation>;
}

export interface Explanation {
  text: string;
  /** Who wrote the text: the assistant, or @tutors/course-rules. */
  by: "assistant" | "rules";
  /** Why the chosen assistant didn't answer, when it didn't; empty otherwise. */
  problem: string;
}
