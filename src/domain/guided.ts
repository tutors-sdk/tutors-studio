/**
 * Guided building (ADR 0071): what a lecturer is asked to add to each kind of item, and the track a first-time
 * lecturer can follow through a new course, week by week and item by item. A complement to the free-form
 * course map: the same items, the same plans, in an order with one next thing to do. Pure.
 */
import type { MapNode } from "./course-map.ts";

/** What an item asks the lecturer to add, by its kind: the button's words, a line on what it does, and the file picker's filter. */
export interface UploadAsk {
  /** On the button: "Upload your slides (PDF)". */
  button: string;
  /** Under it, in a sentence. */
  hint: string;
  /** The file picker's accept filter; empty for any file. */
  accept: string;
  /** True when the item takes several files at once (a lab's pages, pictures and handouts). */
  many: boolean;
}

const SLIDES: UploadAsk = {
  button: "Upload your slides (PDF)",
  hint: "Students open them in the PDF viewer, from this item's card. A new PDF replaces the slides it has now, which go to the bin.",
  accept: ".pdf,application/pdf",
  many: false,
};

const asks: Record<string, UploadAsk> = {
  talk: SLIDES,
  paneltalk: SLIDES,
  tutorial: {
    button: "Upload the problem sheet (PDF)",
    hint: "Students open it in the PDF viewer, from this item's card. A new PDF replaces the one it has now, which goes to the bin.",
    accept: ".pdf,application/pdf",
    many: false,
  },
  lab: {
    button: "Upload your lab content",
    hint: "Markdown pages become the lab's steps, in the order of their names. Pictures, handouts, data and starter code go with them, and the steps' links follow.",
    accept: "",
    many: true,
  },
  note: {
    button: "Upload your reading",
    hint: "A Markdown page becomes the reading itself. A PDF, Word file or anything else is attached and linked from the reading.",
    accept: "",
    many: true,
  },
  archive: {
    button: "Upload the download (zip)",
    hint: "Students download it from this item's card. Anything that isn't a zip is zipped for them.",
    accept: "",
    many: false,
  },
};

/** What an item of a kind asks the lecturer to upload, or null for a kind that takes no upload (a week, a link, a quiz). */
export const uploadFor = (kind: string | null): UploadAsk | null => (kind === null ? null : (asks[kind] ?? null));

/** Studio's words for an upload it can't take; these are about uploading, not a rule. */
export const uploadWords = {
  nothing: "Choose a file to upload.",
  notHere: "This item doesn't take an upload. Drop material on its week instead.",
  onePdf: "Choose one PDF. A talk shows one set of slides; to show another deck, add another lecture to the week.",
  notPdf: (name: string) => `"${name}" isn't a PDF. Save your slides as a PDF (File, then Save as or Export) and upload that.`,
  oneFile: "Choose one file. An archive's card downloads one zip.",
  empty: (name: string) => `"${name}" is empty, so there is nothing to upload.`,
  readingWritten: "This reading already has your writing, so Studio won't write over it. Open it to change it, or upload a PDF or Word file to attach to it.",
  twoPages: "Choose one Markdown page for a reading. Add another reading to the week for the next one.",
} as const;

/** One item on the guide's track. */
export interface GuideItem {
  path: string;
  kind: string;
  title: string;
  /** True once the lecturer has given it their material. */
  done: boolean;
}

/** One week on the guide's track, with its items in the order students see them. */
export interface GuideWeek {
  path: string;
  title: string;
  /** True once the week has a title of the lecturer's own, not the one Studio started it with. */
  named: boolean;
  items: GuideItem[];
}

/** One step of the guide: name a week, add material to an item, or, last, check the course. */
export type GuideStep = { do: "name-week"; week: GuideWeek; weekNumber: number } | { do: "fill"; week: GuideWeek; weekNumber: number; item: GuideItem } | { do: "check" };

/**
 * The kinds the guide stops at, the ones that take material, in the order Tutors shows a week's items
 * (tutors-model-lib's preOrder: talks, tutorials, labs, notes, archives, then panel talks). A link, a quiz
 * or a video has its own editor.
 */
export const guidedKinds = ["talk", "tutorial", "lab", "note", "archive", "paneltalk"] as const;
const shownOrder = (kind: string | null) => (guidedKinds as readonly string[]).indexOf(kind ?? "");

/** Every step of the guide, in order: each week named, then each of its items filled, then a check of the course. */
export function guideSteps(weeks: readonly GuideWeek[]): GuideStep[] {
  return [
    ...weeks.flatMap((week, index): GuideStep[] => [
      { do: "name-week", week, weekNumber: index + 1 },
      ...week.items.map((item): GuideStep => ({ do: "fill", week, weekNumber: index + 1, item })),
    ]),
    { do: "check" },
  ];
}

/** Whether a step is finished: a week has its own title, an item has material. The check is never finished ahead of time. */
export const stepDone = (step: GuideStep): boolean => (step.do === "name-week" ? step.week.named : step.do === "fill" ? step.item.done : false);

/** Where the guide starts: the first step not finished yet, so a course half built picks up where it was left. */
export const firstOpen = (steps: readonly GuideStep[]): number => {
  const at = steps.findIndex((step) => !stepDone(step));
  return at === -1 ? steps.length - 1 : at;
};

/** The next step after `at` that isn't finished, or the check at the end. Skipping a step leaves it for later. */
export const nextOpen = (steps: readonly GuideStep[], at: number): number => {
  for (let i = at + 1; i < steps.length; i++) if (!stepDone(steps[i])) return i;
  return steps.length - 1;
};

/** How far through the guide the lecturer is: the steps finished out of the steps there are to finish. */
export function guideProgress(steps: readonly GuideStep[]): { done: number; of: number } {
  const work = steps.filter((step) => step.do !== "check");
  return { done: work.filter(stepDone).length, of: work.length };
}

/** The guide's heading and sentence for a step, in a lecturer's words. */
export function guideWords(step: GuideStep): { heading: string; line: string } {
  if (step.do === "check")
    return { heading: "Check your course", line: "Every week has been through. Check the course to see what Tutors will show, and what is left to sort out." };
  if (step.do === "name-week") return { heading: `What is week ${step.weekNumber} about?`, line: "Give the week a title students will recognise. You can change it at any time." };
  const what =
    step.item.kind === "lab"
      ? "Add the lab's content: its steps as Markdown pages, with any pictures, handouts and starter code."
      : step.item.kind === "note"
        ? "Add the reading: a Markdown page, or a PDF or Word file to attach to it. Or write it here in Studio."
        : step.item.kind === "archive"
          ? "Add the file students download, as a zip."
          : step.item.kind === "tutorial"
            ? "Add the problem sheet as a PDF."
            : "Add your slides for this lecture, as a PDF.";
  return { heading: step.item.title, line: what };
}

/** The guide's weeks from the course map: each published week in reading order, with the items that take material. */
export function guideWeeks(map: MapNode, done: (item: MapNode) => boolean, named: (week: MapNode) => boolean): GuideWeek[] {
  const weeks: MapNode[] = [];
  const walk = (node: MapNode) => {
    if (node.excluded) return;
    if (node.kind === "topic") weeks.push(node);
    else if (node.kind === "course" || node.kind === "unit" || node.path === "") node.children.forEach(walk);
  };
  walk(map);
  return weeks.map((week) => ({
    path: week.path,
    title: week.title ?? week.name,
    named: named(week),
    items: week.children
      .filter((child) => !child.excluded && shownOrder(child.kind) !== -1)
      .sort((a, b) => shownOrder(a.kind) - shownOrder(b.kind) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
      .map((child) => ({ path: child.path, kind: child.kind!, title: child.title ?? child.name, done: done(child) })),
  }));
}

/**
 * The titles Studio starts a week with: tutors-create's "Topic 3", a shaped week's "Week 3", a template's
 * "Week 3: ..." placeholder. A week still titled one of these hasn't been named by the lecturer yet.
 */
export const startingWeekTitle = (title: string | null): boolean => title === null || /^(topic|week)\s+\d+\s*$/i.test(title.trim());

/** The line a starter Marp deck from tutors-create asks the lecturer to replace: a deck still holding it has no slides of theirs. */
export const STARTER_DECK_LINE = "> Replace this with the central idea of your talk.";

/** The steps not done yet, in order, the check left out: what the end of the guide lists as still to do. */
export const stillToDo = (steps: readonly GuideStep[]): GuideStep[] => steps.filter((step) => step.do !== "check" && !stepDone(step));
