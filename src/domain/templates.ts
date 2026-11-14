/**
 * The starter template (ADRs 0039, 0041): Lecture and lab, a whole course to start from beside the reference
 * courses and the guided questions. It follows the Typical topic of the Tutors reference course
 * (tutors-sdk/tutors-reference-course) and comes in 2, 4, 6, 8, 10 and 12 weeks. A template says what every
 * week holds and what sits beside the weeks; the length decides the sections and, from six weeks, a closing review week with a quiz. Pure: the
 * same template and length always give the same files.
 */
import { slugify } from "./slug.ts";
import type { QuizForm } from "./quiz.ts";

/** The lengths a template comes in, in teaching weeks. */
export const TEMPLATE_LENGTHS = [2, 4, 6, 8, 10, 12] as const;

/** From this many weeks, a template course is split into sections and ends with a review week. */
export const REVIEW_FROM = 6;

export type TemplateKind = "talk" | "paneltalk" | "lab" | "note" | "panelnote" | "archive";

export interface TemplateItem {
  kind: TemplateKind;
  /** The card title; {n} is the week number. */
  title: string;
}

/** One weekly template (ADR 0041 kept Lecture and lab; reference courses are the other starting point). */
export type TemplateId = "lecture-lab";

export interface CourseTemplate {
  id: TemplateId;
  /** What a lecturer calls this kind of module. */
  name: string;
  /** What every week holds, in a sentence. */
  week: string;
  /** When a lecturer would pick it. */
  pickedWhen: string;
  /** The reference course topic it is modelled on, as the reference course titles it. */
  modelledOn: string;
  /** What every weekly topic holds, in order. */
  items: TemplateItem[];
  /** What sits beside the weeks, in the side unit. */
  side: TemplateItem[];
}

const handbook: TemplateItem = { kind: "note", title: "Module handbook" };

export const courseTemplates: readonly CourseTemplate[] = [
  {
    id: "lecture-lab",
    name: "Lecture and lab",
    week: "A lecture with slides, a step-by-step lab and a page of supporting resources.",
    pickedWhen: "Most modules: a lecture, then a practical.",
    modelledOn: "Typical",
    items: [
      { kind: "talk", title: "Week {n} lecture" },
      { kind: "lab", title: "Week {n} lab" },
      { kind: "note", title: "Week {n} supporting resources" },
    ],
    side: [handbook, { kind: "talk", title: "Introduction" }],
  },
];

export const templateById = (id: string): CourseTemplate | undefined => courseTemplates.find((template) => template.id === id);

/** The sections a template course's weeks fall into: one up to four weeks, two up to ten, three for twelve. Each is the week numbers it holds. */
export function sectionsFor(weeks: number): number[][] {
  const count = weeks <= 4 ? 1 : weeks <= 10 ? 2 : 3;
  const size = Math.ceil(weeks / count);
  return Array.from({ length: count }, (_, i) => Array.from({ length: Math.min(size, weeks - i * size) }, (_, j) => i * size + j + 1));
}

/**
 * Each sentence a template writes for the lecturer to write over. A page still holding one of these is not
 * written yet (STU-0086, STU-0154).
 */
export const templateStarter = {
  topic: "What students learn this week, in a sentence or two.",
  section: "The weeks this section groups.",
  unit: "What this part of the week groups.",
  review: "A look back over the module before the assessment.",
  side: "The handbook and everything that spans the whole module.",
  talk: "What this lecture covers, in a sentence for its card.",
  paneltalk: "Students see these slides on the week's page. Add the recording as a video link when you have it.",
  panelnote: "Students read this on the week's page. Write the seminar's introduction here.",
  note: "Write this page here.",
  archive: "Put a .zip in this folder; students download it from this card.",
  labSetup: "What students build in this lab, and what they need before they start.",
  labStep: "One thing to do in this step, and how students know it worked.",
  labExercises: "Exercises to try once the steps are done.",
  quiz: "Check what you remember from the module. Replace these questions with your own.",
} as const;

const starterLines: ReadonlySet<string> = new Set(Object.values(templateStarter));

/** True while a page still holds a sentence a template wrote for the lecturer to write over. */
export const hasTemplateStarterText = (markdown: string): boolean => markdown.split(/\r?\n/).some((line) => starterLines.has(line.trim()));

export const templateIcons: Record<TemplateKind | "topic" | "quiz", string> = {
  topic: "fluent-color:calendar-24",
  talk: "fluent-color:slide-text-sparkle-24",
  paneltalk: "fluent-color:slide-text-sparkle-24",
  note: "fluent-color:notebook-24",
  panelnote: "fluent-color:notebook-24",
  lab: "fluent-color:wrench-screwdriver-24",
  archive: "fluent-color:folder-24",
  quiz: "fluent-color:question-circle-20",
};
const ICONS = templateIcons;

export const templatePage = (icon: string, heading: string, summary: string, body = "") =>
  `---\nicon:\n  type: ${icon}\n---\n\n# ${heading}\n\n${summary}\n${body === "" ? "" : `\n${body}\n`}`;

export const templateDeck = (heading: string) =>
  `---\nmarp: true\ntheme: default\npaginate: true\n---\n\n# ${heading}\n\n---\n\n## What we'll cover\n\n- The first idea\n- The second idea\n\n---\n\n## The first idea\n\n- Something students will take away\n\n---\n\n## Summary\n\n- What to remember before the lab\n`;

const LAB_STEPS = 3;

/** An item's files, relative to its own folder. */
export function templateItemFiles(item: TemplateItem, week: number): { path: string; content: string }[] {
  const heading = item.title.replace("{n}", String(week));
  switch (item.kind) {
    case "talk":
      return [
        { path: "talk.md", content: templatePage(ICONS.talk, heading, templateStarter.talk) },
        { path: "talk.marp", content: templateDeck(heading) },
      ];
    case "paneltalk":
      return [
        { path: "talk.md", content: templatePage(ICONS.paneltalk, heading, templateStarter.paneltalk) },
        { path: "talk.marp", content: templateDeck(heading) },
      ];
    case "note":
      return [{ path: "note.md", content: templatePage(ICONS.note, heading, templateStarter.note) }];
    case "panelnote":
      return [{ path: "note.md", content: templatePage(ICONS.panelnote, heading, templateStarter.panelnote) }];
    case "archive":
      return [{ path: "archive.md", content: templatePage(ICONS.archive, heading, templateStarter.archive) }];
    case "lab": {
      const pad = (n: number) => String(n).padStart(2, "0");
      return [
        { path: "00.Setup.md", content: templatePage(ICONS.lab, heading, templateStarter.labSetup) },
        ...Array.from({ length: LAB_STEPS }, (_, i) => ({ path: `${pad(i + 1)}.Step-${pad(i + 1)}.md`, content: `# Step ${i + 1}\n\n${templateStarter.labStep}\n` })),
        { path: `${pad(LAB_STEPS + 1)}.Exercises.md`, content: `# Exercises\n\n${templateStarter.labExercises}\n` },
      ];
    }
  }
}

/** Folders for a topic's items, numbered per kind and named from the title: lab-01-week-3-lab, lab-02-week-3-extra-practice. */
function itemFolders(items: readonly TemplateItem[], week: number): string[] {
  const counts: Record<string, number> = {};
  return items.map((item) => {
    counts[item.kind] = (counts[item.kind] ?? 0) + 1;
    const n = String(counts[item.kind]).padStart(2, "0");
    // A panel item is the week's page itself; one per week, so it needs no name.
    return item.kind.startsWith("panel") ? `${item.kind}-${n}` : `${item.kind}-${n}-${slugify(item.title.replace("{n}", String(week)))}`;
  });
}

const itemsIn = (items: readonly TemplateItem[], week: number, under: string) =>
  itemFolders(items, week).flatMap((folder, i) => templateItemFiles(items[i], week).map((file) => ({ path: `${under}/${folder}/${file.path}`, content: file.content })));

/** The review week's quiz: two questions to replace, as the quiz designer would start them. */
export const reviewQuiz: QuizForm = {
  heading: "Check your understanding",
  introduction: templateStarter.quiz,
  timeLimit: null,
  blockTitle: null,
  questions: [
    { kind: "multiple-choice", text: "Which week covered the idea you found hardest?", answers: ["An early week", "A middle week", "A late week"], right: 0 },
    { kind: "true-false", text: "You can retake this quiz as often as you like.", answers: ["True", "False"], right: 0 },
  ],
};

/**
 * Every file of a template course except the course's own root files (course.md, properties.yaml and the
 * rest, which the course rules write): the side unit, the sections and one topic per week. `quizPage` is the
 * review quiz written as the reader reads quizzes, from the course rules.
 */
export function templateFiles(template: CourseTemplate, weeks: number, quizPage: string): { path: string; content: string }[] {
  const files: { path: string; content: string }[] = [{ path: "side/side.md", content: `Module\n\n${templateStarter.side}\n` }];
  files.push(...itemsIn(template.side, 1, "side"));
  const review = weeks >= REVIEW_FROM;
  sectionsFor(weeks).forEach((section, s) => {
    const unit = `unit-${s + 1}`;
    const span = section.length === 1 ? `Week ${section[0]}` : `Weeks ${section[0]}–${section[section.length - 1]}`;
    files.push({ path: `${unit}/unit.md`, content: `${span}\n\n${templateStarter.section}\n` });
    for (const week of section) {
      const topic = `${unit}/topic-${String(week).padStart(2, "0")}`;
      if (review && week === weeks) {
        files.push({ path: `${topic}/topic.md`, content: templatePage(ICONS.topic, `Week ${week}: review`, templateStarter.review) });
        files.push({ path: `${topic}/note-01-what-we-covered/note.md`, content: templatePage(ICONS.note, "What we covered", templateStarter.note) });
        files.push({ path: `${topic}/quiz-01-check-your-understanding/quiz.md`, content: quizPage });
      } else {
        files.push({ path: `${topic}/topic.md`, content: templatePage(ICONS.topic, `Week ${week}`, templateStarter.topic) });
        files.push(...itemsIn(template.items, week, topic));
      }
    }
  });
  return files;
}

/** What a template course will hold, for the plan's summary: "the Lecture and lab template: 6 weeks in 2 sections, ending with a review week". */
export function describeTemplateCourse(template: CourseTemplate, weeks: number): string {
  const sections = sectionsFor(weeks).length;
  return `the ${template.name} template: ${weeks} weeks${sections > 1 ? ` in ${sections} sections` : ""}${weeks >= REVIEW_FROM ? ", ending with a review week" : ""}`;
}
