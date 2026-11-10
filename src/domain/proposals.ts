/**
 * What Studio makes of an assistant's answer (feature 13, ADR 0036): a lab drafted from the lecturer's
 * notes, read as steps, and titles and an order suggested for a week, read as a list. The assistant only
 * answers in text; Studio turns the text into a plan the lecturer accepts. Pure.
 */

/** One step of a drafted lab: its title from its heading, and the page beneath it. */
export interface DraftedStep {
  title: string;
  body: string;
}

/** One item in a suggested order, with the title suggested for it and why. */
export interface Suggested {
  /** The item's folder name in the week, as Studio sent it. */
  name: string;
  title: string;
  why: string;
}

/** A reply without the code fence some models wrap it in. */
const unfenced = (text: string) =>
  text
    .trim()
    .replace(/^```[\w-]*\n([\s\S]*?)\n```$/, "$1")
    .trim();

/**
 * A drafted lab's steps: each level-one heading starts a step, and anything before the first heading is
 * left out. A step keeps its heading so its page reads as Tutors shows it. Empty when there is no heading.
 */
export function draftedSteps(markdown: string): DraftedStep[] {
  const steps: DraftedStep[] = [];
  for (const part of unfenced(markdown).split(/^(?=# )/m)) {
    const heading = /^# +(.+?)\s*$/m.exec(part);
    if (heading === null || !part.startsWith("# ")) continue;
    const title = heading[1].replace(/\s+/g, " ").trim();
    if (title !== "") steps.push({ title, body: `${part.trimEnd()}\n` });
  }
  return steps;
}

/**
 * A suggested order with titles, from the assistant's JSON answer: `{"items": [{"name", "title", "why"}]}`
 * or the list alone. Only names Studio sent are kept, each once; null when the answer isn't such a list.
 */
export function suggestedOrder(text: string, names: readonly string[]): Suggested[] | null {
  const body = unfenced(text);
  const start = body.search(/[[{]/);
  if (start === -1) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(body.slice(start, Math.max(body.lastIndexOf("}"), body.lastIndexOf("]")) + 1));
  } catch {
    return null;
  }
  const list = Array.isArray(parsed) ? parsed : (parsed as { items?: unknown })?.items;
  if (!Array.isArray(list)) return null;
  const seen = new Set<string>();
  const kept: Suggested[] = [];
  for (const entry of list as { name?: unknown; title?: unknown; why?: unknown }[]) {
    const name = typeof entry?.name === "string" ? entry.name : "";
    if (!names.includes(name) || seen.has(name)) continue;
    seen.add(name);
    const title = typeof entry.title === "string" ? entry.title.replace(/\s+/g, " ").trim() : "";
    const why = typeof entry.why === "string" ? entry.why.trim() : "";
    kept.push({ name, title, why });
  }
  return kept;
}

/** Studio's own sentences when an assistant's proposal can't become a plan. */
export const proposalWords = {
  noAssistant: "No assistant is chosen yet. Choose one in Settings, under Assistant, to draft and suggest.",
  noNotes: "Paste your notes first: the assistant drafts the lab from them.",
  noSteps: "The assistant's draft had no steps Studio could read. Try again, or add the steps yourself.",
  noSuggestion: "The assistant's answer wasn't a list Studio could read. Try again.",
  nothingToChange: "The assistant suggests keeping this week as it is.",
  nothingToOrder: "This week has nothing to put in order yet.",
};
