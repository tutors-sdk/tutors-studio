import { findFolder } from "../../domain/arrange.ts";
import { labelFor, type CourseFolder } from "../../domain/course-map.ts";
import { stepFileFor, stepsOf } from "../../domain/lab-steps.ts";
import type { FileOp } from "../../domain/plan.ts";
import { draftedSteps, proposalWords } from "../../domain/proposals.ts";
import { AssistantUnavailable, type AssistantPort, type Suggestion } from "../ports/assistant.ts";
import type { ArrangePlan } from "../ports/authoring.ts";
import type { CourseRulesPort } from "../ports/course-rules.ts";
import type { FileSystemPort } from "../ports/file-system.ts";

/** How much of each item's page the assistant is shown when it suggests an order: enough to know what it is about. */
const PAGE_START = 400;

const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
const encode = (text: string) => new TextEncoder().encode(text);

/**
 * The assistant that proposes (feature 13, ADR 0036): a lab drafted from the lecturer's notes, and titles
 * and an order suggested for a week. The assistant reads only markdown it is given and answers in text;
 * each answer becomes a plan the lecturer accepts, so nothing is written until they do (ADR 0004).
 */
export function proposalUseCases(deps: { fs: FileSystemPort; rules: CourseRulesPort; assistant: AssistantPort; newId: () => string }) {
  const { fs, rules, assistant } = deps;
  const refuse = (message: string): ArrangePlan => ({ ok: false, message });
  /** The assistant's answer, or the sentence for why there is none. */
  async function asking<T>(question: () => Promise<T>): Promise<{ answer: T } | { problem: string }> {
    try {
      return { answer: await question() };
    } catch (error) {
      if (error instanceof AssistantUnavailable) return { problem: error.message };
      throw error;
    }
  }
  const noneChosen = () => assistant.capabilities().modelId === null;

  /** The start of the page Tutors takes an item's title from (a lab's first step), as markdown. */
  async function pageStart(item: CourseFolder): Promise<string> {
    const pages = item.files.map((file) => file.name).filter((name) => name.endsWith(".md"));
    const page = pages.find((name) => name === `${item.kind}.md`) ?? stepsOf(pages)[0]?.file ?? [...pages].sort()[0];
    return page === undefined ? "" : decode(await fs.read(`${item.path}/${page}`)).slice(0, PAGE_START);
  }

  return {
    /** A lab's steps drafted by the assistant from the lecturer's notes, added after the steps it has. */
    async planLabDraft(lab: string, notes: string): Promise<ArrangePlan> {
      const folder = findFolder(await rules.buildTree(fs), lab);
      if (folder === undefined || folder.kind !== "lab") return refuse(`Studio can't find the lab "${lab}" in this course.`);
      if (notes.trim() === "") return refuse(proposalWords.noNotes);
      const drafted = await asking(() => assistant.draft("lab-steps", notes));
      if ("problem" in drafted) return refuse(drafted.problem);
      if (drafted.answer.trim() === "") return refuse(noneChosen() ? proposalWords.noAssistant : proposalWords.noSteps);
      const steps = draftedSteps(drafted.answer);
      if (steps.length === 0) return refuse(proposalWords.noSteps);
      const have = stepsOf(folder.files.map((file) => file.name));
      const first = have.length === 0 ? 1 : have[have.length - 1].number + 1;
      const ops: FileOp[] = steps.map((step, i) => ({ op: "write", path: `${lab}/${stepFileFor(first + i, step.title)}`, content: encode(step.body) }));
      const labTitle = folder.title ?? folder.name;
      return {
        ok: true,
        plan: { id: deps.newId(), summary: `Add ${steps.length} step${steps.length === 1 ? "" : "s"} drafted from your notes to "${labTitle}"`, ops },
        notes: steps.map((step) => `New step: ${step.title}`),
        select: lab,
      };
    },

    /** The titles and order the assistant suggests for a week's items, as one plan: titles first, then the order. */
    async planWeekSuggestion(week: string): Promise<ArrangePlan> {
      const folder = findFolder(await rules.buildTree(fs), week);
      if (folder === undefined || folder.kind !== "topic") return refuse(`Studio can't find the week "${week}" in this course.`);
      const items = folder.children.filter((child) => child.kind !== null);
      if (items.length === 0) return refuse(proposalWords.nothingToOrder);
      const shown = await Promise.all(items.map(async (item) => ({ name: item.name, kind: labelFor(item.kind), title: item.title ?? item.name, page: await pageStart(item) })));
      const weekTitle = folder.title ?? folder.name;
      const suggested = await asking(() => assistant.suggest("order", { week: weekTitle, items: JSON.stringify(shown) }));
      if ("problem" in suggested) return refuse(suggested.problem);
      const about = suggested.answer.filter((each): each is Suggestion & { for: string } => items.some((item) => item.name === each.for));
      if (about.length === 0) return refuse(noneChosen() ? proposalWords.noAssistant : proposalWords.noSuggestion);

      const ops: FileOp[] = [];
      const notes: string[] = [];
      for (const suggestion of about) {
        const item = items.find((candidate) => candidate.name === suggestion.for)!;
        const title = suggestion.value.trim();
        if (title === "" || title === (item.title ?? "")) continue;
        const planned = await rules.rewire(fs, { action: "retitle", item: item.path, title });
        if (!planned.ok) continue;
        ops.push(...planned.ops);
        notes.push(`"${item.title ?? item.name}" becomes "${title}": ${suggestion.evidence[0]}`);
      }
      // Tutors orders a week by kind first, so each kind is put in the order suggested among its own items.
      const order = about.map((each) => each.for);
      for (const kind of new Set(items.map((item) => item.kind))) {
        const now = items.filter((item) => item.kind === kind).map((item) => item.name);
        const wanted = [...order.filter((name) => now.includes(name)), ...now.filter((name) => !order.includes(name))];
        if (wanted.every((name, i) => name === now[i])) continue;
        const planned = await rules.rewire(fs, { action: "reorder", folder: week, order: wanted });
        if (!planned.ok) continue;
        ops.push(...planned.ops);
        notes.push(...planned.notes);
        const titles = wanted.map((name) => items.find((item) => item.name === name)!.title ?? name);
        notes.push(`${labelFor(kind)}s in this order: ${titles.join(", ")}`);
      }
      if (ops.length === 0) return refuse(proposalWords.nothingToChange);
      return { ok: true, plan: { id: deps.newId(), summary: `Give "${weekTitle}" the titles and order the assistant suggests`, ops }, notes, select: week };
    },
  };
}
