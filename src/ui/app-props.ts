// What App.svelte is given by src/main.ts: an opened course, a folder of the lecturer's own material, and the
// ports and steps behind each screen.
import type { AuthoringPort, OpenedPage, OpenedQuiz } from "../application/ports/authoring.ts";
import type { CompanionPort } from "../application/companion/companion.ts";
import type { HandOffPort } from "../application/ports/hand-off.ts";
import type { AgentDesk } from "../application/use-cases/agent-desk.ts";
import type { LoadAnswers, LoadPlan, LoadProblem } from "../application/use-cases/load-course.ts";
import type { AnswerProblem, CourseAnswers } from "../domain/new-course.ts";
import type { PreferencesPort } from "../application/ports/preferences.ts";
import type { Appearance } from "../domain/appearance.ts";
import type { PublishingPort } from "../application/ports/publishing.ts";
import type { LiveTutorsPort } from "../application/ports/live-tutors.ts";
import type { StudioUpdates } from "../application/use-cases/updates.ts";
import type { MyFiles as MyFilesPort } from "../application/use-cases/my-files.ts";
import type { Accounts } from "../application/use-cases/accounts.ts";
import type { DriveLink } from "../application/use-cases/drive.ts";
import type { ShareProblem, ShareRequest } from "../application/use-cases/share.ts";
import type { LibraryShelf } from "../application/use-cases/library.ts";
import type { ComposeAnswers, ComposeProblem } from "../application/use-cases/compose-course.ts";
import type { ComposePick } from "../domain/compose.ts";
import type { RecentCourse } from "../application/use-cases/recent-courses.ts";
import type { UsagePort } from "../application/ports/usage.ts";
import type { CommandLinePort } from "../application/ports/command-line.ts";

/** A folder of the lecturer's own material, with what a course made from it would hold and the step that makes it. */
export type MaterialFolder = {
  folderName: string;
  preview: (answers: LoadAnswers) => { ok: true; load: LoadPlan } | { ok: false; problems: LoadProblem[] };
  create: (answers: LoadAnswers) => Promise<OpenedCourse | { reason: string } | null>;
};
/** An opened course; `key` names it for the assistant's read permission (its folder, ADR 0006). */
export type OpenedCourse = {
  name: string;
  key: string;
  companion: CompanionPort;
  authoring: AuthoringPort;
  publishing: PublishingPort | null;
  handOff: HandOffPort | null;
  live?: LiveTutorsPort | null;
  /** Next year's course made from this one in a folder the lecturer picks (STU-0199); null when they cancelled. */
  rollOver?: (answers: { name: string; start: string | null }) => Promise<OpenedCourse | { reason: string } | null>;
  /** An assistant on this computer: the lecturer's switch and the plans waiting for them (ADRs 0051, 0052); absent in the browser preview. */
  agent?: AgentDesk;
};

/** The Library screen: the folders and what is in them, and a new course made from picks in them. */
export type LibraryScreen = {
  shelf: LibraryShelf;
  /** The plan for a composed course, to read before accepting it; nothing is written. */
  preview: (answers: ComposeAnswers, picks: ComposePick[]) => Promise<{ ok: true; summary: string; notes: string[] } | { ok: false; problems: ComposeProblem[] }>;
  /** Makes the composed course in a folder the lecturer picks and opens it; the reason when nothing was made, null when they cancelled. */
  create: (answers: ComposeAnswers, picks: ComposePick[]) => Promise<OpenedCourse | { reason: string } | null>;
  /** Library folders and registries on Google Drive (ADR 0064); absent where Studio can't reach Drive. */
  drive?: DriveLink;
  /** Sharing a ready course, or one item, into a folder registry (ADR 0063). */
  share: {
    /** Asks for the registry's folder; null when the lecturer cancelled. */
    choose: () => Promise<string | null>;
    /** The plan, to read before accepting it; nothing is written. */
    preview: (request: ShareRequest) => Promise<{ ok: true; summary: string; notes: string[] } | { ok: false; problems: ShareProblem[] }>;
    /** Shares as planned: what it was shared as, or the reason nothing was. */
    apply: (request: ShareRequest) => Promise<{ shared: string } | { reason: string }>;
  };
};

export interface AppProps {
  /**
   * Loads a folder the lecturer points at: a Tutors course opens as it is; a folder of their own material
   * comes back to make a course from. Null when the lecturer cancelled.
   */
  openCourse: () => Promise<OpenedCourse | { material: MaterialFolder } | { missing: string } | null>;
  /** Guided creation: the answers' check, and the step that creates the course. */
  newCourse: {
    check: (answers: CourseAnswers) => AnswerProblem[];
    /** Creates the course and opens it, or resolves to the reason nothing was created; null when the lecturer cancelled. */
    create: (answers: CourseAnswers) => Promise<OpenedCourse | { reason: string } | null>;
  };
  /** Settings: appearance and the Tutors .env, with the appearance in force when the window opened. */
  preferences: PreferencesPort;
  initialAppearance: Appearance;
  /** Opens a link in the lecturer's browser. */
  openLink: (url: string) => void;
  /** Asks the lecturer for a folder on this computer, and shows a file in its folder; absent in the browser preview. */
  folders?: { choose: (title: string) => Promise<string | null>; show: (path: string) => void };
  rulesVersion: string;
  /** Checking for a newer Studio (ADR 0033). */
  updates?: StudioUpdates;
  /** Answers questions while no course is open, from Studio's own guide. */
  guide: CompanionPort;
  /** The lecturer's own folder beside the course, read only (feature 5); absent where Studio can't read outside the course. */
  myFiles?: MyFilesPort;
  /** Netlify's sign-in, kept in Settings (feature 16). */
  accounts?: Accounts;
  /** The lecturer's library: folders Studio searches for courses to borrow from, read only (ADR 0061), and composing a course from it (ADR 0062). */
  library?: LibraryScreen;
  /** The courses opened lately, newest first, and opening one again by its folder (feature 9); absent in the browser preview. */
  recent?: {
    list: () => Promise<RecentCourse[]>;
    /** Takes a course off the list only; nothing on disk changes (STU-0148). */
    forget: (path: string) => Promise<void>;
    /** Puts a course just forgotten back at its place in the list (STU-0149). */
    restore: (path: string, at: number) => Promise<void>;
    open: (path: string) => Promise<OpenedCourse | { material: MaterialFolder } | { missing: string } | null>;
  };
  /** The course open when Studio last closed, reopened as it starts. */
  initialCourse?: OpenedCourse;
  /** Opt-in usage counts in Settings (ADR 0037). */
  usage?: UsagePort;
  /** Studio's command line for any terminal, in Settings (ADR 0053). */
  commandLine?: CommandLinePort;
}

export type Pane =
  | { kind: "history" | "check" | "publishing" }
  | { kind: "writing" | "editing"; page: OpenedPage }
  | { kind: "designing"; quiz: { folder: string; opened: OpenedQuiz; where: string } }
  | null;
