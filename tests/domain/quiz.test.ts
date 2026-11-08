import { describe, expect, it } from "vitest";
import { emptyQuiz, joinSnippet, newQuestion, splitSnippet, trueFalseQuestion } from "../../src/domain/quiz.ts";

describe("the quiz form", () => {
  it("starts empty, with two blank answers for a new question", () => {
    expect(emptyQuiz("Week 1")).toEqual({ heading: "Week 1", introduction: "", timeLimit: null, blockTitle: null, questions: [] });
    expect(newQuestion()).toEqual({ kind: "multiple-choice", text: "", answers: ["", ""], right: 0 });
  });

  it("makes a true or false question with True and False as its answers", () => {
    expect(trueFalseQuestion("Q")).toEqual({ kind: "true-false", text: "Q", answers: ["True", "False"], right: 0 });
  });
});

describe("a question's code snippet", () => {
  it("splits a trailing fenced block from the words, and joins it back", () => {
    const text = "What does this print?\n\n```js\nconsole.log(1);\n```";
    const parts = splitSnippet(text);
    expect(parts).toEqual({ words: "What does this print?", code: "console.log(1);", language: "js" });
    expect(joinSnippet(parts)).toBe(text);
  });

  it("leaves text it can't split as words", () => {
    for (const text of ["Plain", "```js\na\n```\nthen words", "A\n\n```\none\n```\n\n```\ntwo\n```"]) expect(splitSnippet(text)).toEqual({ words: text, code: "", language: "" });
  });

  it("fences a snippet that holds backticks with a longer fence, and drops an empty one", () => {
    expect(joinSnippet({ words: "Q", code: "```\nx\n```", language: "" })).toBe("Q\n\n````\n```\nx\n```\n````");
    expect(splitSnippet("Q\n\n````md\n```\nx\n```\n````")).toEqual({ words: "Q", code: "```\nx\n```", language: "md" });
    expect(joinSnippet({ words: "Q ", code: "  \n", language: "js" })).toBe("Q ");
  });
});
