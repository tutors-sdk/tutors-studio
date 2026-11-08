/**
 * A quiz as the lecturer sees it in the designer: a title, an optional introduction, an optional time
 * per question, and questions with their answers and the right one ticked. No markdown: the rules
 * adapter turns this into the quiz page the reader reads, and back.
 */
export interface QuizForm {
  /** The quiz's title: the page's heading, which the card shows. */
  heading: string;
  /** Text shown above the questions; may be empty. */
  introduction: string;
  /** Seconds allowed per question, or null for untimed. */
  timeLimit: number | null;
  /** A title the page's quiz block already names, kept as it is; null when there is none. */
  blockTitle: string | null;
  questions: QuizFormQuestion[];
}

export interface QuizFormQuestion {
  kind: "multiple-choice" | "true-false";
  /** May hold a code snippet in a fenced block. */
  text: string;
  /** One per answer; for true-false always True and False. */
  answers: string[];
  /** 0-based index into answers of the right one. */
  right: number;
}

export const emptyQuiz = (heading = ""): QuizForm => ({ heading, introduction: "", timeLimit: null, blockTitle: null, questions: [] });

export const newQuestion = (): QuizFormQuestion => ({ kind: "multiple-choice", text: "", answers: ["", ""], right: 0 });

export const trueFalseQuestion = (text = ""): QuizFormQuestion => ({ kind: "true-false", text, answers: ["True", "False"], right: 0 });

/** A question's text as the designer edits it: the words, and one optional code snippet shown below them. */
export interface QuestionText {
  words: string;
  code: string;
  /** The snippet's language, such as js or java; empty for plain text. */
  language: string;
}

const TRAILING_SNIPPET = /^([\s\S]*?)\n*(`{3,}|~{3,})([^\n`]*)\n([\s\S]*?)\n\2[ \t]*$/;

/**
 * A question's markdown split into words and a code snippet, when it ends in one fenced block and has no
 * other. Anything else stays as words, so the designer never hides text it can't show.
 */
export function splitSnippet(text: string): QuestionText {
  const match = TRAILING_SNIPPET.exec(text.replace(/\r\n?/g, "\n").trimEnd());
  const fence = match?.[2] ?? "";
  const closesEarly = (line: string) => line.trim().length >= fence.length && line.trim() === fence[0].repeat(line.trim().length);
  if (match === null || /^\s*(`{3,}|~{3,})/m.test(match[1]) || match[4].split("\n").some(closesEarly)) return { words: text, code: "", language: "" };
  return { words: match[1].trim(), code: match[4], language: match[3].trim() };
}

/** The question's markdown: the words, then the snippet in a fence longer than any backtick run inside it. */
export function joinSnippet({ words, code, language }: QuestionText): string {
  if (code.trim() === "") return words;
  const longest = Math.max(0, ...(code.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(Math.max(3, longest + 1));
  return `${words.trim()}\n\n${fence}${language.trim()}\n${code.replace(/\s+$/, "")}\n${fence}`;
}
