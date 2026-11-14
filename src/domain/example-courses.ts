/**
 * Named templates (ADR 0041): whole courses shaped like real Tutors courses Studio has been checked against,
 * week for week, with every unit, item and lab step titled as the original titles it. Only the shape and
 * titles come from the original; every page holds Studio's starter text for the lecturer to write over, so a
 * course made from one opens with every week still to write (STU-0154). Pure: the same example always gives
 * the same files.
 */
import { stepFileFor } from "./lab-steps.ts";
import { slugify } from "./slug.ts";
import { templateIcons, templateItemFiles, templatePage, templateStarter, type TemplateKind } from "./templates.ts";
import { exampleCourses } from "./example-courses-data.ts";
import type { ExampleCourse, ExampleItem, ExampleUnit } from "./example-course-shape.ts";

export { exampleCourses };
export type { ExampleCourse, ExampleItem, ExampleKind, ExampleUnit, ExampleWeek } from "./example-course-shape.ts";

export const exampleById = (id: string): ExampleCourse | undefined => exampleCourses.find((example) => example.id === id);

/** How many items a course made from the example holds, of every kind, for its summary. */
export function exampleItemCount(example: ExampleCourse): number {
  const inUnits = (units: readonly ExampleUnit[]) => units.reduce((sum, unit) => sum + unit.items.length, 0);
  return example.weeks.reduce((sum, week) => sum + week.items.length + inUnits(week.units), 0) + inUnits(example.side) + example.home.length;
}

/** "Web Development II (edeleastar/module-web-dev-2-2022): 8 weeks, 51 items". */
export const describeExampleCourse = (example: ExampleCourse): string =>
  `the ${example.name} template (shaped on ${example.modelledOn}): ${example.weeks.length} weeks, ${exampleItemCount(example)} items`;

const pad = (n: number) => String(n).padStart(2, "0");

/** A folder name from a title, without the number the folder already carries: "1: Introducing Javascript" and "Lab 01 JS Intro" lose their leading numbers. */
const named = (title: string, fallback: string) =>
  slugify(title.replace(/^\s*(?:(?:lab|week|topic|unit)\s*)?\d+[a-z]?\s*[:.·)\-]?\s+/i, ""))
    .slice(0, 40)
    .replace(/-+$/, "") || fallback;

/** One item's files, relative to its own folder. `quiz` writes a quiz page titled as given. */
function exampleItemFiles(item: ExampleItem, quiz: (title: string) => string): { path: string; content: string }[] {
  switch (item.kind) {
    case "lab":
      return [
        { path: stepFileFor(0, item.title), content: templatePage(templateIcons.lab, item.title, templateStarter.labSetup) },
        ...(item.steps ?? []).map((step, i) => ({ path: stepFileFor(i + 1, step), content: `# ${step}\n\n${templateStarter.labStep}\n` })),
      ];
    case "web":
      return [
        { path: "web.md", content: `${item.title}\n` },
        { path: "weburl", content: `${item.url ?? "https://tutors.dev"}\n` },
      ];
    case "quiz":
      return [{ path: "quiz.md", content: quiz(item.title) }];
    default:
      return templateItemFiles({ kind: item.kind, title: item.title }, 1);
  }
}

/** Items in a folder, numbered per kind and named from their titles, as Studio names a new item: talk-01-introduction. */
function itemsUnder(items: readonly ExampleItem[], under: string, quiz: (title: string) => string): { path: string; content: string }[] {
  const counts: Record<string, number> = {};
  return items.flatMap((item) => {
    counts[item.kind] = (counts[item.kind] ?? 0) + 1;
    const n = pad(counts[item.kind]);
    const folder = item.kind.startsWith("panel") ? `${item.kind}-${n}` : `${item.kind}-${n}-${named(item.title, "item")}`;
    return exampleItemFiles(item, quiz).map((file) => ({ path: `${under}${folder}/${file.path}`, content: file.content }));
  });
}

/** Units in a folder: unit-1-…, and side-1-… for side units. */
function unitsUnder(units: readonly ExampleUnit[], under: string, quiz: (title: string) => string): { path: string; content: string }[] {
  const counts = { unit: 0, side: 0 };
  return units.flatMap((unit) => {
    const kind = unit.side ? "side" : "unit";
    counts[kind] += 1;
    const folder = `${under}${kind}-${counts[kind]}-${named(unit.title, kind)}`;
    return [{ path: `${folder}/${kind}.md`, content: `${unit.title}\n\n${templateStarter.unit}\n` }, ...itemsUnder(unit.items, `${folder}/`, quiz)];
  });
}

/**
 * Every file of a course made from an example, except the course's own root files (course.md,
 * properties.yaml and the rest, which the course rules write): one topic per week, numbered in the
 * original's order, its units and items, and the side units and panel items at the top. `quiz` writes a
 * quiz page with the given heading, from the course rules.
 */
export function exampleFiles(example: ExampleCourse, quiz: (title: string) => string): { path: string; content: string }[] {
  const files = [...itemsUnder(example.home, "", quiz), ...unitsUnder(example.side, "", quiz)];
  example.weeks.forEach((week, i) => {
    const topic = `topic-${pad(i + 1)}-${named(week.title, "week")}`;
    files.push({ path: `${topic}/topic.md`, content: templatePage(templateIcons.topic, week.title, templateStarter.topic) });
    files.push(...itemsUnder(week.items, `${topic}/`, quiz), ...unitsUnder(week.units, `${topic}/`, quiz));
  });
  return files;
}
