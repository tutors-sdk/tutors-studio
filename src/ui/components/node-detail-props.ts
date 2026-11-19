// What the week, item and course-home view (NodeDetail.svelte) is given: the node, its plans, and the steps behind each panel.
import type { MapNode, WeekState } from "../../domain/course-map.ts";
import type { Finding } from "../../domain/finding.ts";
import type { Plan } from "../../domain/plan.ts";
import type { ArrangePlan, Explanation, ItemPlan, MaterialPlan, PageEntry } from "../../application/ports/authoring.ts";
import type { DroppedFile } from "../../domain/material.ts";
import type { ArrangeAction } from "../../domain/arrange.ts";
import type { Term } from "../../domain/term.ts";
import type { WeekEngagement } from "../../application/ports/engagement.ts";
import type { Coverage, Outcome, OutcomeDraft } from "../../domain/outcomes.ts";
import type { CardPicture, CourseDetails } from "../../domain/course-details.ts";
import type { LabChange, LabStep } from "../../domain/lab-steps.ts";

/** Reordering, moving, renaming, hiding and removing (STU-0095 to STU-0103): each asks for a plan, shown before anything changes. */
export type NodeArrange = {
  root: MapNode;
  places: { path: string; title: string }[];
  proposal: { summary: string; notes: string[] } | null;
  onArrange: (action: ArrangeAction) => void;
  onAccept: () => void;
  onCancel: () => void;
  /** Shows any other plan in the same box: course details and card pictures (STU-0104 to STU-0108). */
  onPropose: (planned: Promise<ArrangePlan>) => void | Promise<void>;
  details: () => Promise<CourseDetails>;
  planDetails: (wanted: { title: string; credits: string; start: string | null }) => Promise<ArrangePlan>;
  cardPicture: (folder: string) => Promise<CardPicture>;
  planPicture: (folder: string, file: DroppedFile) => Promise<ArrangePlan>;
  /** The lab builder (feature 10): a lab's steps, and the plan for a change to them. */
  labSteps?: (lab: string) => Promise<LabStep[]>;
  planLabStep?: (lab: string, change: LabChange) => Promise<ArrangePlan>;
  /** The assistant that proposes (feature 13): a lab drafted from notes, a week's titles and order, each as a plan. */
  planLabDraft?: (lab: string, notes: string) => Promise<ArrangePlan>;
  planWeekSuggestion?: (week: string) => Promise<ArrangePlan>;
  /** Learning outcomes (STU-0187 to STU-0192): the list and map on the course, the tags on an item, each change a plan. */
  outcomes?: {
    list: () => Promise<Outcome[]>;
    coverage: () => Promise<Coverage | null>;
    tagged: (item: string) => Promise<string[]>;
    plan: (drafts: OutcomeDraft[]) => Promise<ArrangePlan>;
    tag: (item: string, ids: string[]) => Promise<ArrangePlan>;
    /** With an assistant chosen: outcomes from a module description, and which a week's items serve (STU-0194, STU-0195). */
    draft?: (description: string) => Promise<ArrangePlan>;
    suggestServes?: (week: string) => Promise<ArrangePlan>;
  };
  /** The term (STU-0196 to STU-0198): today's week on the course home, a week's release date, and showing a due week, each change a plan. */
  term?: {
    read: () => Promise<Term | null>;
    planRelease: (folder: string, date: string | null) => Promise<ArrangePlan>;
    planShowDue: (folder: string) => Promise<ArrangePlan>;
  };
};

export interface NodeDetailProps {
  node: MapNode;
  pending: Plan | null;
  onFix: (finding: Finding) => void;
  onAccept: () => void;
  onCancel: () => void;
  /** Opens the quiz designer: on a new quiz in this folder, or on this quiz folder's quiz. */
  onQuiz?: (folder: string) => void;
  /** Plans dropped material for this folder (a topic, or the course); without it there is no drop zone. */
  onMaterial?: (folder: string, files: DroppedFile[]) => Promise<MaterialPlan>;
  onAcceptMaterial?: (plan: Plan) => void;
  /** Plans a new item named in the lecturer's words (a lab in a week, a week in the course); without it there is no form. */
  onItem?: (folder: string, word: string, title: string, address: string) => Promise<ItemPlan>;
  /** For a folder Tutors leaves out: where it sits ("week" or "course"), and how to plan making it visible by its plain name. */
  visible?: { scope: "week" | "course"; plan: (folder: string, word: string) => Promise<ItemPlan> };
  /** The chosen assistant's name ("Claude"), and how to ask it to explain a finding; absent when none is chosen. */
  assistant?: { name: string; explain: (finding: Finding) => Promise<Explanation> };
  /** Advanced mode's extras: file names, and editing a page's markdown. */
  showFileNames?: boolean;
  onEdit?: (path: string) => void;
  /** The pages in this folder, and how to write one in plain language (ADR 0026). */
  pages?: PageEntry[];
  /** Pages saved in this sitting, marked "Saved just now". */
  savedNow?: string[];
  onWrite?: (path: string) => void;
  /** The week this item sits in, to go back to. */
  parent?: { path: string; title: string } | null;
  onSelect?: (path: string) => void;
  /** Files from My files to plan as dropped here, and putting a file left in the tray in a week (feature 5). */
  incoming?: DroppedFile[] | null;
  onPlace?: (week: string, file: DroppedFile) => void;
  /** Each week's state, for the course home (feature 9). */
  weekStates?: Record<string, WeekState>;
  /** The weeks changed since the course was last published, marked so on the course home (STU-0139). */
  weeksChanged?: string[];
  /** How students used each week, counts only; null or left out shows nothing (STU-0200, STU-0201). */
  engagement?: Record<string, WeekEngagement> | null;
  /** Reordering, moving, renaming, hiding and removing (STU-0095 to STU-0103): each asks for a plan, shown here before anything changes. */
  arrange?: NodeArrange;
  /** Next year's course from this one, opened once made (STU-0199); answers why not, or null. */
  onRollOver?: (answers: { name: string; start: string | null }) => Promise<string | null>;
}
