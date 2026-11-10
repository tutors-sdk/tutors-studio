import type { LabChange, LabStep } from "../../domain/lab-steps.ts";
import type { MapNode } from "../../domain/course-map.ts";
import type { Finding } from "../../domain/finding.ts";
import type { Plan } from "../../domain/plan.ts";
import type { ArrangeAction } from "../../domain/arrange.ts";
import type { CardPicture, CourseDetails } from "../../domain/course-details.ts";
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

/** One change Studio applied to the open course, as the history lists it. */
export interface HistoryEntry {
  id: string;
  summary: string;
  /** When it was applied, as an ISO time. */
  at: string;
  /** True once it has been put back. */
  undone: boolean;
}

export type UndoPlan = { ok: true; plan: Plan } | { ok: false; message: string };

/** A plan that arranges the course, the sentences to read before accepting it, and where to look once it applies. */
export type ArrangePlan = { ok: true; plan: Plan; notes: string[]; select: string } | { ok: false; message: string };

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
  /** Applies an accepted plan, all of it or none of it, and records it in the history. */
  apply(plan: Plan): Promise<ApplyResult>;
  /** Every change applied since the course was opened, newest first. */
  history(): HistoryEntry[];
  /**
   * The plan that puts a change back, or why it can't be: a file it wrote has changed since, or a folder it
   * moved has moved again. A file the change added goes to the bin, never deleted. Nothing is written.
   */
  planUndo(id: string): Promise<UndoPlan>;
  /**
   * The plan that reorders, moves, retitles, hides, removes or restores an item, from course-rules' own
   * planners, so every name and file stays one Tutors accepts; or the rules' sentence for why not. A
   * removed item goes to the bin, never deleted. Nothing is written.
   */
  planArrange(action: ArrangeAction): Promise<ArrangePlan>;
  /** The course's title, credits and start date, and how many weeks a calendar would date. Reads only. */
  courseDetails(): Promise<CourseDetails>;
  /** The plan that changes the course's title, credits or start date; only what differs is written (STU-0104, STU-0105). */
  planDetails(wanted: { title: string; credits: string; start: string | null }): Promise<ArrangePlan>;
  /** A lab's steps, in the order students see them (feature 10). Reads only. */
  labSteps(lab: string): Promise<LabStep[]>;
  /** The plan that adds, moves, retitles or removes a lab step, or shows a chosen picture in one (STU-0123 to STU-0126). */
  planLabStep(lab: string, change: LabChange): Promise<ArrangePlan>;
  /** The plan that adds the steps the chosen assistant drafts from the lecturer's notes (STU-0136). */
  planLabDraft(lab: string, notes: string): Promise<ArrangePlan>;
  /** The plan that gives a week the titles and order the chosen assistant suggests (STU-0137). */
  planWeekSuggestion(week: string): Promise<ArrangePlan>;
  /** What a folder's card shows: a picture by its name, an icon, or the usual icon for its kind (STU-0108). Reads only. */
  cardPicture(folder: string): Promise<CardPicture>;
  /** The plan that makes a chosen file a folder's card picture, or why it can't be (STU-0106, STU-0107). */
  planPicture(folder: string, file: DroppedFile): Promise<ArrangePlan>;
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
