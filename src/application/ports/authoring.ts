import type { MapNode } from "../../domain/course-map.ts";
import type { Finding } from "../../domain/finding.ts";
import type { Plan } from "../../domain/plan.ts";
import type { QuizForm } from "../../domain/quiz.ts";
import type { DroppedFile, TrayFile } from "../../domain/material.ts";

export interface CourseView {
  map: MapNode;
  findings: Finding[];
}

/** What Studio can show of a file without the reader: a Marp deck's slides, or a page's Mermaid diagrams. */
export type Preview = { kind: "slides"; file: string; css: string; slides: string[] } | { kind: "diagrams"; file: string; diagrams: { line: number; svg: string | null }[] };

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
  /** Previews of the decks and diagrams directly inside a folder, in file-name order. Reads only. */
  previews(folder: string): Promise<Preview[]>;
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
