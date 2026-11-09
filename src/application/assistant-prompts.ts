import type { AskContext } from "./ports/assistant.ts";
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
