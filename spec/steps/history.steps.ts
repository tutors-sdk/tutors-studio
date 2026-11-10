import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { noAssistant } from "../../src/adapters/assistant/none/none-assistant.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "../../src/adapters/telemetry/local/local-telemetry.ts";
import { runHeadless } from "../../src/adapters/cli/headless/headless.ts";
import type { AuthoringPort } from "../../src/application/ports/authoring.ts";
import { createAuthoring } from "../../src/application/use-cases/authoring.ts";
import type { Plan } from "../../src/domain/plan.ts";
import { newQuestion, trueFalseQuestion, type QuizForm } from "../../src/domain/quiz.ts";

const feature = await loadFeature("spec/features/history.feature");

const quiz = (heading: string): QuizForm => ({
  heading,
  introduction: "",
  timeLimit: null,
  blockTitle: null,
  questions: [{ ...newQuestion(), text: "Which tag makes a link?", answers: ["<a>", "<p>"], right: 0 }, trueFalseQuestion("HTTP is stateless.")],
});

describeFeature(feature, ({ Rule }) => {
  let fs: MemoryFileSystem;
  let authoring: AuthoringPort;
  let lines: string[];
  let plan: Plan;

  const withTalk = (_: unknown, name: string) => {
    fs = new MemoryFileSystem({
      "course.md": "# Web Development\n",
      "netlify.toml": '[build]\n  publish = "json"\n',
      "topic-01/topic.md": "# Week one\n",
      [`topic-01/${name}/talk.md`]: "# Introduction\n",
      [`topic-01/${name}/slides.pdf`]: "%PDF",
    });
    let ids = 0;
    let minutes = 0;
    // One session: the same authoring for every command, with a clock a minute apart for each change.
    authoring = createAuthoring({
      fs,
      rules: courseRules,
      assistant: noAssistant,
      telemetry: new LocalTelemetry(),
      newId: () => `plan-${++ids}`,
      now: () => new Date(Date.UTC(2026, 10, 10, 9, minutes++)),
    });
  };
  const run = async (command: string, target = "", form?: QuizForm) => {
    lines = [];
    await runHeadless(authoring, command, (line) => lines.push(line), target, form);
  };
  const fixed = () => run("fix");
  const addsQuiz = (_: unknown, heading: string, topic: string) => run("add-quiz", topic, quiz(heading));
  const putsBack = () => run("undo");
  const printed = (_: unknown, line: string) => expect(lines).toContain(line);
  const has = (_: unknown, path: string) => expect(Object.keys(fs.snapshot()).some((file) => file === path || file.startsWith(`${path}/`))).toBe(true);
  const hasNot = (_: unknown, path: string) => expect(Object.keys(fs.snapshot()).some((file) => file === path || file.startsWith(`${path}/`))).toBe(false);

  Rule("When a lecturer puts back a change Studio applied, the Studio shall show the plan that reverses it and apply that plan only once it is accepted.", ({ RuleScenario }) => {
    RuleScenario("A safe rename put back", ({ Given, When, Then, And }) => {
      Given("a course with a talk folder named {string}", withTalk);
      And("the lecturer has made the safe fixes", fixed);
      When("the lecturer asks to put back the latest change", async () => {
        const planned = await authoring.planUndo(authoring.history()[0].id);
        if (!planned.ok) throw new Error(planned.message);
        plan = planned.plan;
      });
      Then("the plan shall move {string} back to {string}", (_, from: string, to: string) => expect(plan.ops).toEqual([{ op: "move", from, to }]));
      And("the course shall still have {string} until the plan is accepted", has);
      When("the lecturer accepts the plan", async () => expect(await authoring.apply(plan)).toEqual({ ok: true }));
      Then("the course shall have {string} again", has);
    });
  });

  Rule("The Studio shall list each change it applied to the open course since it was opened, newest first, with the time it was applied.", ({ RuleScenario }) => {
    RuleScenario("Two changes, newest first", ({ Given, When, Then, And }) => {
      Given("a course with a talk folder named {string}", withTalk);
      And("the lecturer has made the safe fixes", fixed);
      And("the lecturer has added a quiz {string} to {string}", addsQuiz);
      When("the lecturer asks for the history", () => run("history"));
      Then("the command shall print {string}", (_, line: string) => expect(lines[0]).toBe(line));
      And("the command shall then print {string}", (_, line: string) => expect(lines[1]).toBe(line));
    });
  });

  Rule("If a file a change wrote has changed since, then the Studio shall keep that change in place and name the file.", ({ RuleScenario }) => {
    RuleScenario("A quiz edited by hand after Studio added it", ({ Given, When, Then, And }) => {
      Given("a course with a talk folder named {string}", withTalk);
      And("the lecturer has added a quiz {string} to {string}", addsQuiz);
      And("the quiz page has been edited outside Studio", () => fs.write("topic-01/quiz-week-one-check/quiz.md", new TextEncoder().encode("# Edited by hand\n")));
      When("the lecturer puts back the latest change", putsBack);
      Then("the command shall print {string}", printed);
      And("the quiz page shall keep the edit", async () => expect(new TextDecoder().decode(await fs.read("topic-01/quiz-week-one-check/quiz.md"))).toBe("# Edited by hand\n"));
    });
  });

  Rule("When a lecturer puts back a change that added files, the Studio shall move them to the course's bin and delete nothing.", ({ RuleScenario }) => {
    RuleScenario("A new quiz put back", ({ Given, When, Then, And }) => {
      Given("a course with a talk folder named {string}", withTalk);
      And("the lecturer has added a quiz {string} to {string}", addsQuiz);
      When("the lecturer puts back the latest change", putsBack);
      Then("the command shall print {string}", printed);
      And("the course shall have {string}", has);
      And("the course shall not have {string}", hasNot);
    });
  });
});
