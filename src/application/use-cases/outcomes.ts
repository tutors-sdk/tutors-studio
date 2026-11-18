import { findFolder } from "../../domain/arrange.ts";
import type { CourseFolder } from "../../domain/course-map.ts";
import {
  coverage,
  nextOutcomeId,
  outcomeProblem,
  OUTCOMES_FILE,
  outcomesOfPage,
  outcomesYaml,
  pageWithOutcomes,
  parseOutcomes,
  type BloomLevel,
  type Coverage,
  type CoverageWeek,
  type Outcome,
  type OutcomeDraft,
} from "../../domain/outcomes.ts";
import type { ArrangePlan } from "../ports/authoring.ts";
import type { CourseRulesPort } from "../ports/course-rules.ts";
import type { FileSystemPort } from "../ports/file-system.ts";

const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
const encode = (text: string) => new TextEncoder().encode(text);
const ALREADY = "That is already how the course is.";
const COMPOSITE = ["course", "unit", "side", "topic"];

/** The topics in course order, each with the items in it and below it. */
function weeksIn(folder: CourseFolder): CourseFolder[] {
  return folder.kind === "topic" ? [folder] : folder.children.flatMap(weeksIn);
}
function itemsIn(folder: CourseFolder): CourseFolder[] {
  return folder.children.flatMap((child) => (child.kind !== null && !COMPOSITE.includes(child.kind) ? [child, ...itemsIn(child)] : itemsIn(child)));
}

/** Learning outcomes and the coverage map (STU-0187 to STU-0193): read from the course, changed only through accepted plans. */
export function outcomeUseCases(deps: { fs: FileSystemPort; rules: CourseRulesPort; newId: () => string }) {
  const { fs, rules } = deps;
  const readText = async (path: string) => ((await fs.exists(path)) ? decode(await fs.read(path)) : null);

  async function outcomes(): Promise<Outcome[]> {
    return parseOutcomes((await readText(OUTCOMES_FILE)) ?? "");
  }

  /** The outcomes an item names, read from its card's page; none for a folder with no page. */
  async function itemOutcomes(path: string): Promise<string[]> {
    const folder = findFolder(await rules.buildTree(fs), path);
    const page = folder === undefined ? undefined : rules.descriptorOf(folder);
    const text = page === undefined ? null : await readText(page);
    return text === null ? [] : outcomesOfPage(text);
  }

  return {
    outcomes,
    itemOutcomes,

    /** The plan that writes the course's outcomes as the lecturer left them on Course details. */
    async planOutcomes(drafts: readonly OutcomeDraft[]): Promise<ArrangePlan> {
      const before = await outcomes();
      const written: Outcome[] = [];
      for (const [index, draft] of drafts.entries()) {
        const text = draft.text.replace(/\s+/g, " ").trim();
        const problem = outcomeProblem(text, draft.level);
        if (problem !== null) return { ok: false, message: `Outcome ${index + 1}: ${problem}` };
        const id = draft.id && before.some((outcome) => outcome.id === draft.id) ? draft.id : nextOutcomeId([...before, ...written]);
        written.push({ id, text, level: draft.level as BloomLevel });
      }
      const content = outcomesYaml(written);
      if (content === (await readText(OUTCOMES_FILE)) || (written.length === 0 && before.length === 0 && !(await fs.exists(OUTCOMES_FILE)))) return { ok: false, message: ALREADY };
      const summary =
        written.length === 0
          ? "Take out the course's learning outcomes"
          : `Write the course's ${written.length === 1 ? "learning outcome" : `${written.length} learning outcomes`}`;
      return { ok: true, plan: { id: deps.newId(), summary, ops: [{ op: "write", path: OUTCOMES_FILE, content: encode(content) }] }, notes: [], select: "" };
    },

    /** The plan that tags an item with the outcomes it serves: one line in its card's page (STU-0188). */
    async planTag(path: string, ids: readonly string[]): Promise<ArrangePlan> {
      const folder = findFolder(await rules.buildTree(fs), path);
      const page = folder === undefined || folder.kind === null || COMPOSITE.includes(folder.kind) ? undefined : rules.descriptorOf(folder);
      if (folder === undefined || page === undefined) return { ok: false, message: "Only a lecture, lab, reading or quiz can serve an outcome." };
      const known = new Set((await outcomes()).map((outcome) => outcome.id));
      const wanted = [...new Set(ids)].filter((id) => known.has(id));
      const text = (await readText(page)) ?? "";
      const next = pageWithOutcomes(text, wanted);
      if (next === text) return { ok: false, message: ALREADY };
      const title = folder.title ?? folder.name;
      const summary = wanted.length === 0 ? `Take the outcomes off "${title}"` : `Tag "${title}" with ${wanted.join(", ")}`;
      return { ok: true, plan: { id: deps.newId(), summary, ops: [{ op: "write", path: page, content: encode(next) }] }, notes: [], select: path };
    },

    /** The coverage map, or null for a course with no outcomes (STU-0192). */
    async coverage(): Promise<Coverage | null> {
      const written = await outcomes();
      if (written.length === 0) return null;
      const tree = await rules.buildTree(fs);
      const weeks: CoverageWeek[] = [];
      for (const week of weeksIn(tree)) {
        const items = [];
        for (const item of itemsIn(week)) {
          const page = rules.descriptorOf(item);
          const text = page === undefined ? null : await readText(page);
          items.push({ path: item.path, kind: item.kind, outcomes: text === null ? [] : outcomesOfPage(text) });
        }
        weeks.push({ path: week.path, title: week.title ?? week.name, items });
      }
      return coverage(written, weeks);
    },
  };
}
