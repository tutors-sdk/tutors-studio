import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { noAssistant } from "../../src/adapters/assistant/none/none-assistant.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "../../src/adapters/telemetry/local/local-telemetry.ts";
import { runHeadless } from "../../src/adapters/cli/headless/headless.ts";
import { createAuthoring } from "../../src/application/use-cases/authoring.ts";
import { newQuestion, trueFalseQuestion, type QuizForm } from "../../src/domain/quiz.ts";

const feature = await loadFeature("spec/features/quiz-designer.feature");

const base = {
  "course.md": "# Web Development\n",
  "netlify.toml": '[build]\n  publish = "json"\n',
  "topic-01/topic.md": "# Week one\n",
};
const weekOneQuiz = (second = "") => ({
  ...base,
  "topic-01/quiz-01/quiz.md":
    "# Week one check\n\nTry these before the lab.\n\n```quiz\ntime_limit: 30\n---\nquestion: Which tag makes a link?\noptions:\n  - <a>\n  - <p>\ncorrect: 0\n" + second + "```\n",
});
const codeQuestion = { ...newQuestion(), text: "What does this print?\n\n```js\nconsole.log(typeof null);\n```", answers: ["object", "null"], right: 0 };
const twoQuestions = (heading: string): QuizForm => ({
  heading,
  introduction: "",
  timeLimit: null,
  blockTitle: null,
  questions: [codeQuestion, trueFalseQuestion("HTTP is stateless.")],
});

describeFeature(feature, ({ Rule }) => {
  let fs: MemoryFileSystem;
  let before: Record<string, string>;
  let lines: string[];

  const authoring = () => createAuthoring({ fs, rules: courseRules, assistant: noAssistant, telemetry: new LocalTelemetry(), newId: () => "plan-1" });
  const run = async (command: string, target = "", form?: QuizForm) => {
    lines = [];
    await runHeadless(authoring(), command, (line) => lines.push(line), target, form);
  };
  const given = (files: Record<string, string>) => {
    fs = new MemoryFileSystem(files);
    before = fs.snapshot();
  };
  const printed = (_: unknown, line: string) => expect(lines).toContain(line);
  const opens = async (_: unknown, folder: string) => run("quiz", folder);
  const addsTwo = async (_: unknown, heading: string, topic: string) => run("add-quiz", topic, twoQuestions(heading));
  const opensShowing = async (_: unknown, folder: string, line: string) => {
    await run("quiz", folder);
    expect(lines).toContain(line);
  };
  const withOneTopic = () => given(base);
  const weekOne = () => given(weekOneQuiz());

  Rule(
    "When a lecturer saves a new quiz in a topic, the Studio shall add one new quiz folder to that topic whose page the reader shows with the questions and right answers chosen.",
    ({ RuleScenario }) => {
      RuleScenario("A two-question quiz with a code snippet and a true or false question", ({ Given, When, Then, And }) => {
        Given("a course with one topic and no quizzes", withOneTopic);
        When("the lecturer adds the quiz {string} to {string} with a code question and a true or false question", addsTwo);
        Then("the command shall print {string}", printed);
        And("the course shall check out", async () => {
          await run("check");
          expect(lines).toContain("Everything checks out.");
        });
        And("opening {string} shall show {string}", opensShowing);
        And("the answer marked right in that question shall be {string}", (_: unknown, answer: string) => {
          const at = lines.indexOf("2. HTTP is stateless.");
          expect(lines.slice(at + 1, at + 3)).toEqual([`   [right] ${answer}`, "   [     ] False"]);
        });
      });
      RuleScenario("A quiz whose name is taken goes in a numbered folder", ({ Given, When, Then, And }) => {
        Given("a course whose topic already has the quiz folder {string}", (_: unknown, name: string) =>
          given({ ...base, [`topic-01/${name}/quiz.md`]: "# HTTP basics\n\n```quiz\nquestion: Q?\noptions:\n  - a\n  - b\ncorrect: 1\n```\n" }),
        );
        When("the lecturer adds the quiz {string} to {string} with a code question and a true or false question", addsTwo);
        Then("the command shall print {string}", printed);
        And("the page {string} shall be unchanged", (_: unknown, page: string) => expect(fs.snapshot()[page]).toBe(before[page]));
      });
    },
  );

  Rule(
    "If a quiz in the designer can't be saved so the reader shows it as typed, then the Studio shall change nothing and give the course-rules sentence for the question at fault.",
    ({ RuleScenario }) => {
      RuleScenario("A question with only one answer", ({ Given, When, Then, And }) => {
        Given("a course with one topic and no quizzes", withOneTopic);
        When("the lecturer adds a quiz to {string} whose second question has one answer", (_: unknown, topic: string) =>
          run("add-quiz", topic, { ...twoQuestions("Broken"), questions: [codeQuestion, { ...newQuestion(), text: "Only one?", answers: ["yes"] }] }),
        );
        Then("the command shall print {string}", printed);
        And("the topic {string} shall hold no quiz folder", (_: unknown, topic: string) => {
          expect(Object.keys(fs.snapshot()).filter((path) => path.startsWith(`${topic}/quiz-`))).toEqual([]);
          expect(fs.snapshot()).toEqual(before);
        });
      });
    },
  );

  Rule("When a lecturer opens a quiz, the Studio shall show its title, time limit, questions, answers and right answers without any markdown.", ({ RuleScenario }) => {
    RuleScenario("A timed quiz opens as questions and ticked answers", ({ Given, When, Then, And }) => {
      Given("a course with a 30-second quiz {string} whose first question asks {string}", weekOne);
      When("the lecturer opens the quiz in {string}", opens);
      Then("the designer shall show the title {string}", (_: unknown, title: string) => expect(lines[0]).toBe(`Quiz: ${title}`));
      And("the designer shall show {string}", printed);
      And("the designer shall show the first question {string} with the answer {string} marked right", (_: unknown, text: string, answer: string) =>
        expect(lines.slice(2, 5)).toEqual([`1. ${text}`, `   [right] ${answer}`, "   [     ] <p>"]),
      );
    });
  });

  Rule("When a lecturer saves changes to a quiz they opened, the Studio shall rewrite only that quiz's page and keep its title and introduction.", ({ RuleScenario }) => {
    RuleScenario("Adding a question to an existing quiz", ({ Given, When, Then, And }) => {
      Given("a course with a 30-second quiz {string} whose first question asks {string}", weekOne);
      When("the lecturer opens {string}, adds the question {string} and saves it", async (_: unknown, folder: string, text: string) => {
        const opened = await authoring().openQuiz(folder);
        const form = { ...opened.form, questions: [...opened.form.questions, { ...newQuestion(), text, answers: ["<p>", "<b>"], right: 0 }] };
        await run("save-quiz", folder, form);
      });
      Then("the command shall print {string}", printed);
      And("the page {string} shall still start with {string} and {string}", (_: unknown, page: string, heading: string, intro: string) => {
        expect(fs.snapshot()[page].startsWith(`${heading}\n\n${intro}\n\n`)).toBe(true);
        expect(fs.snapshot()[page]).toContain("time_limit: 30");
      });
      And("no other file shall change", () => {
        const after = fs.snapshot();
        const changed = Object.keys(after).filter((path) => after[path] !== before[path]);
        expect(changed).toEqual(["topic-01/quiz-01/quiz.md"]);
        expect(Object.keys(after).sort()).toEqual(Object.keys(before).sort());
      });
    });
  });

  Rule("If a quiz page holds a question the reader leaves out, then the Studio shall name that question when the quiz opens, before saving removes it.", ({ RuleScenario }) => {
    RuleScenario("A question with no right answer marked", ({ Given, When, Then }) => {
      Given("a course whose quiz has a second question {string} with no right answer", (_: unknown, text: string) =>
        given(weekOneQuiz(`---\nquestion: ${text}\noptions:\n  - red\n  - blue\n`)),
      );
      When("the lecturer opens the quiz in {string}", opens);
      Then("the command shall say it leaves out question {int} {string}", (_: unknown, number: number, text: string) => {
        const left = lines.filter((line) => line.startsWith("Left out: "));
        expect(left).toHaveLength(1);
        expect(left[0]).toContain(`Question ${number} ("${text}")`);
      });
    });
  });
});
