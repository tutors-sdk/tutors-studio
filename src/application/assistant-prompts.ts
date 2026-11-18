import type { AskContext, Suggestion } from "./ports/assistant.ts";
import { suggestedOrder, suggestedServes } from "../domain/proposals.ts";
import type { Finding } from "../domain/finding.ts";

/**
 * What every assistant is told and given, whichever model answers (ADR 0005): the same words to each, so
 * their answers can be compared fairly. Fixed text first, so a provider's prompt cache can reuse it.
 */
export const EXPLAIN_SYSTEM = [
  "You help a university lecturer who is not a developer get their course ready to publish with Tutors.",
  "Tutors reads a course folder: each folder's name says what kind of thing it is (topic-, talk-, lab-, note- and so on) and folders it can't read are left out of the published course.",
  "You are given one problem a checker found. Its message is correct and is the authority; don't contradict it or add rules of your own.",
  "Explain it in two or three short, plain sentences: what students would miss, and the one thing to do about it.",
  "Write for the lecturer, in British English, with no headings, lists, code or Markdown.",
].join(" ");

/** For a question the lecturer typed to the companion. */
export const ASK_SYSTEM = [
  "You are the helper inside Tutors Studio, for a university lecturer who is not a developer.",
  "Studio shows their course week by week, checks it, and publishes it. Lecturers add material by dropping files on a week; changes are only made after they accept a plan.",
  "You are given their question, the screen they are on, and the checker's sentences about their course. The checker is the authority; don't contradict it or invent rules.",
  "You cannot change the course or see its pages. Never claim to have done anything; say what the lecturer can do in Studio.",
  "Answer in at most four short, plain sentences, in British English, with no headings, lists, code or Markdown, and without mentioning files or folders unless they ask.",
].join(" ");

/** The one finding an explanation is about, and nothing else from the course. */
export const describeFinding = (finding: Finding) =>
  [`Where: ${finding.path === "" ? "the course folder itself" : finding.path}`, `How serious: ${finding.severity}`, `The checker's message: ${finding.message}`].join("\n");

/** The lecturer's question, the screen they are on, and the checker's sentences. */
export const describeQuestion = (question: string, context: AskContext) =>
  [
    `The lecturer's question: ${question}`,
    `Screen: ${context.where}`,
    `The checker says: ${context.problems.length === 0 ? "nothing is wrong" : context.problems.join(" | ")}`,
  ].join("\n");

/** For "Draft this lab from my notes" (feature 13): steps only, from the notes only. */
export const DRAFT_LAB_SYSTEM = [
  "You help a university lecturer turn their own notes into a lab that students work through step by step, published with Tutors.",
  "You are given the lecturer's notes in Markdown. Use only what the notes say; don't add facts, links or code of your own.",
  "Answer with the lab in Markdown and nothing else: between three and eight steps, each starting with a level-one heading (# ) naming what students do in it, then short instructions.",
  "Keep the lecturer's code blocks, pictures and links exactly as written. Write in British English.",
].join(" ");

/** For "Suggest titles and an order" (feature 13): a list Studio reads, never a change. */
export const ORDER_SYSTEM = [
  "You help a university lecturer arrange one week of a course published with Tutors.",
  "You are given the week's items as JSON: each has a name, what kind it is, its title, and the start of its page.",
  "Suggest the order students should meet them in and a clear, short title for each, keeping a title that is already clear.",
  'Answer with JSON and nothing else: {"items": [{"name": "<the name you were given>", "title": "<suggested title>", "why": "<one short sentence>"}]}, every item once, in your suggested order.',
  "Write titles and reasons in British English, without Markdown.",
].join(" ");

/** The week an order is suggested for, as the assistant is given it. */
export const describeWeek = (context: Record<string, string>) => [`Week: ${context.week ?? ""}`, `Items: ${context.items ?? "[]"}`].join("\n");

/**
 * The assistant's answer to "order" as suggestions, one per item in the order it suggests, each `for` the
 * item's name; the names are those Studio sent under `items`. Empty when the answer isn't a list Studio reads.
 */
export function orderSuggestions(answer: string, context: Record<string, string>, by: string): Suggestion[] {
  let names: string[] = [];
  try {
    names = (JSON.parse(context.items ?? "[]") as { name: string }[]).map((item) => item.name);
  } catch {
    return [];
  }
  return (suggestedOrder(answer, names) ?? []).map((item) => ({ value: item.title, confidence: 0.5, evidence: [item.why || `Suggested by ${by}`], for: item.name }));
}

/** For "Suggest outcomes from my module description" (ADR 0048): a list Studio reads, never a change. */
export const DRAFT_OUTCOMES_SYSTEM = [
  "You help a university lecturer write the learning outcomes of one module published with Tutors.",
  "You are given the lecturer's module description. Use only what it says; don't add topics of your own.",
  'Suggest between three and eight outcomes, each a sentence that begins "Students can" and names one thing students can do by the end, with the Bloom level it reaches: Remember, Understand, Apply, Analyse, Evaluate or Create.',
  'Answer with JSON and nothing else: {"outcomes": [{"text": "Students can ...", "level": "<one of the six levels>"}]}. Write in British English, without Markdown.',
].join(" ");

/** For "Suggest which outcomes each item serves" (ADR 0048): a list Studio reads, never a change. */
export const SERVES_SYSTEM = [
  "You help a university lecturer see which learning outcomes each item of one week of a course serves.",
  "You are given the course's outcomes as JSON (each with an id, a sentence and a level) and the week's items as JSON: each has a name, what kind it is, its title, and the start of its page.",
  "For each item, name the outcomes it clearly serves, and none when it serves none. A lecture or reading teaches, a lab practises, and a quiz assesses.",
  'Answer with JSON and nothing else: {"items": [{"name": "<the name you were given>", "outcomes": ["<id>"], "why": "<one short sentence>"}]}, every item once.',
  "Write reasons in British English, without Markdown.",
].join(" ");

/** The outcomes and the week's items, as the assistant is given them for "serves". */
export const describeServes = (context: Record<string, string>) => [`Outcomes: ${context.outcomes ?? "[]"}`, `Items: ${context.items ?? "[]"}`].join("\n");

/** The assistant's answer to "serves" as one suggestion per item, `for` its name, its value the ids joined by commas. */
export function servesSuggestions(answer: string, context: Record<string, string>, by: string): Suggestion[] {
  let names: string[] = [];
  let ids: string[] = [];
  try {
    names = (JSON.parse(context.items ?? "[]") as { name: string }[]).map((item) => item.name);
    ids = (JSON.parse(context.outcomes ?? "[]") as { id: string }[]).map((outcome) => outcome.id);
  } catch {
    return [];
  }
  return suggestedServes(answer, names, ids).map((item) => ({ value: item.outcomes.join(","), confidence: 0.5, evidence: [item.why || `Suggested by ${by}`], for: item.name }));
}
