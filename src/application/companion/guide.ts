import type { CompanionDestination } from "./moments.ts";

/** Studio's own short guide: how the companion answers with no assistant chosen. About using Studio, never about a rule. */
export interface GuideAnswer {
  text: string;
  action: { label: string; goes: CompanionDestination } | null;
}

interface Topic extends GuideAnswer {
  words: string[];
}

const topics: readonly Topic[] = [
  {
    words: ["add", "slide", "slides", "upload", "drop", "pdf", "powerpoint", "material", "file", "files"],
    text: "Choose a week in the contents, then drop your slides, notes or links onto it. Studio shows you what it will add before anything changes.",
    action: null,
  },
  {
    words: ["publish", "live", "students", "share", "online", "netlify"],
    text: "Choose Check and publish at the bottom of the contents. Studio checks the course first, then puts it online for your students.",
    action: { label: "Go there", goes: "check" },
  },
  {
    words: ["quiz", "question", "questions", "test"],
    text: "Open a week and choose Add a quiz. You write the questions and answers in a form, and Studio does the rest.",
    action: null,
  },
  {
    words: ["fix", "wrong", "problem", "problems", "error", "errors", "missing", "red"],
    text: "Anything that needs sorting out is listed on its week, and all together under Check and publish. Studio always shows a fix before making it.",
    action: { label: "See them all", goes: "check" },
  },
  {
    words: ["undo", "safe", "delete", "lose", "change", "changes", "overwrite"],
    text: "Nothing in your course changes until you have seen what will happen and chosen Make this change.",
    action: null,
  },
  {
    words: ["bigger", "text", "size", "dark", "dyslexia", "contrast", "font", "read"],
    text: "Settings has dark mode, dyslexia mode, larger text and high contrast.",
    action: { label: "Open Settings", goes: "settings" },
  },
  {
    words: ["assistant", "ai", "claude", "key", "private", "privacy"],
    text: "You can connect an assistant in Settings. It only reads the courses you allow, and Studio works fully without one.",
    action: { label: "Open Settings", goes: "settings" },
  },
  {
    words: ["markdown", "edit", "advanced", "code", "source"],
    text: "Turn on Advanced mode in Settings to edit a page's markdown directly.",
    action: { label: "Open Settings", goes: "settings" },
  },
];

const fallback: GuideAnswer = { text: "I can help with adding material, quizzes, fixing problems, publishing and Settings. Try asking about one of those.", action: null };

/** The topic sharing the most words with the question; ties go to the earlier topic. */
export function answerFromGuide(question: string): GuideAnswer {
  const asked = new Set(question.toLowerCase().match(/[a-z]+/g) ?? []);
  let best: Topic | null = null;
  let score = 0;
  for (const topic of topics) {
    const hits = topic.words.filter((word) => asked.has(word)).length;
    if (hits > score) [best, score] = [topic, hits];
  }
  return best === null ? fallback : { text: best.text, action: best.action };
}
