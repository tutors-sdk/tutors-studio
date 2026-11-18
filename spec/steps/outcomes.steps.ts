import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { noAssistant } from "../../src/adapters/assistant/none/none-assistant.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "../../src/adapters/telemetry/local/local-telemetry.ts";
import { runHeadless } from "../../src/adapters/cli/headless/headless.ts";
import { createAuthoring } from "../../src/application/use-cases/authoring.ts";
import { parseOutcomes } from "../../src/domain/outcomes.ts";
import { anthropicAssistant } from "../../src/adapters/assistant/anthropic/anthropic-assistant.ts";
import type { ArrangePlan } from "../../src/application/ports/authoring.ts";
import { FakeClaude } from "../../tests/support/fake-claude.ts";

const feature = await loadFeature("spec/features/outcomes.feature");

const quizPage = () => {
  const written = courseRules.writeQuiz({
    heading: "Forms quiz",
    introduction: "",
    timeLimit: null,
    blockTitle: null,
    questions: [{ kind: "true-false", text: "A form sends data.", answers: ["True", "False"], right: 0 }],
  });
  if (!written.ok) throw new Error(written.message);
  return written.markdown;
};

describeFeature(feature, ({ Background, Rule }) => {
  let fs: MemoryFileSystem;
  let before: Record<string, string>;
  let lines: string[];
  const authoring = () => createAuthoring({ fs, rules: courseRules, assistant: noAssistant, telemetry: new LocalTelemetry(), newId: () => "plan-1" });
  const run = async (command: string, target = "") => {
    lines = [];
    await runHeadless(authoring(), command, (line) => lines.push(line), target);
  };
  const files: Record<string, string> = {};

  Background(({ Given, And }) => {
    Given("a course {string} with three weeks", (_, title: string) => {
      for (const key of Object.keys(files)) delete files[key];
      Object.assign(files, {
        "course.md": `# ${title}\n\nWelcome.\n`,
        "netlify.toml": '[build]\n  publish = "json"\n',
        "topic-01/topic.md": "# Week 1\n",
        "topic-02/topic.md": "# Week 2\n",
        "topic-03/topic.md": "# Week 3\n",
      });
    });
    And("week 1 holds a lecture {string} and a lab {string}", (_, talk: string, lab: string) => {
      files["topic-01/talk-01/talk.md"] = `# ${talk}\n`;
      files["topic-01/talk-01/talk.pdf"] = "%PDF";
      files["topic-01/lab-01/01.first.md"] = `# ${lab}\n\nStep one.\n`;
    });
    And("week 2 holds a lecture {string} and a quiz {string}", (_, talk: string) => {
      files["topic-02/talk-01/talk.md"] = `# ${talk}\n`;
      files["topic-02/talk-01/talk.pdf"] = "%PDF";
      files["topic-02/quiz-01/quiz.md"] = quizPage();
    });
    And("week 3 holds a lecture {string}", (_, talk: string) => {
      files["topic-03/talk-01/talk.md"] = `# ${talk}\n`;
      files["topic-03/talk-01/talk.pdf"] = "%PDF";
      fs = new MemoryFileSystem({ ...files });
      before = fs.snapshot();
    });
  });

  const writeOutcomes = (_: unknown, words: string) => run("outcomes", words);
  const outcomesWritten = () => run("outcomes", "Understand: Students can explain how a web page is built|Apply: Students can build a page with a form");
  const tags = (_: unknown, item: string, ids: string) => run("tag", `${item} ${ids}`);
  const asks = () => run("outcomes");
  const prints = (_: unknown, line: string) => expect(lines, lines.join("\n")).toContain(line);

  Rule(
    'When a lecturer writes the course\'s learning outcomes, the Studio shall show a plan that keeps each in outcomes.yaml at the course root with an id, a sentence that begins "Students can" and one of the six Bloom levels.',
    ({ RuleScenario }) => {
      RuleScenario("Writing two outcomes", ({ When, Then, And }) => {
        When("the lecturer writes the outcomes {string}", writeOutcomes);
        Then("the command prints {string}", prints);
        const holds = (_: unknown, id: string, text: string, level: string) => expect(parseOutcomes(fs.snapshot()["outcomes.yaml"] ?? "")).toContainEqual({ id, text, level });
        And("outcomes.yaml holds LO1 {string} at {string}", (_, text: string, level: string) => holds(_, "LO1", text, level));
        And("outcomes.yaml holds LO2 {string} at {string}", (_, text: string, level: string) => holds(_, "LO2", text, level));
      });
      RuleScenario("An outcome that doesn't say what students can do", ({ When, Then, And }) => {
        When("the lecturer writes the outcomes {string}", writeOutcomes);
        Then("the command prints a line starting {string}", (_, start: string) =>
          expect(
            lines.some((line) => line.startsWith(start)),
            lines.join("\n"),
          ).toBe(true),
        );
        And("the course has no outcomes.yaml", () => expect(fs.snapshot()).not.toHaveProperty("outcomes.yaml"));
      });
    },
  );

  Rule("When a lecturer tags an item with an outcome, the Studio shall show the change as a plan that writes one line to that item.", ({ RuleScenario }) => {
    RuleScenario("Tagging a lab", ({ Given, When, Then, And }) => {
      Given("the course's outcomes are written", outcomesWritten);
      When("the lecturer tags {string} with {string}", async (_, item: string, ids: string) => {
        before = fs.snapshot();
        await tags(_, item, ids);
      });
      Then("the command prints the plan to tag {string} with {string}", (_, title: string, ids: string) => expect(lines).toContain(`Plan: Tag "${title}" with ${ids}.`));
      And("only {string} changed, with the line {string}", (_, path: string, line: string) => {
        const after = fs.snapshot();
        const changed = Object.keys(after).filter((key) => after[key] !== before[key]);
        expect(changed).toEqual([path]);
        expect(after[path].split("\n")).toContain(line);
        expect(after[path].split("\n").length - before[path].split("\n").length).toBe(3);
      });
    });
    RuleScenario("Saving a quiz keeps what it assesses", ({ Given, And, When, Then }) => {
      Given("the course's outcomes are written", outcomesWritten);
      And("the lecturer tagged {string} with {string}", tags);
      When("the lecturer saves the quiz in {string} with the designer", async (_, folder: string) => {
        const studio = authoring();
        const opened = await studio.openQuiz(folder);
        const planned = await studio.planQuiz({ page: opened.page! }, { ...opened.form, introduction: "Try these." });
        expect(planned.ok).toBe(true);
        if (planned.ok) expect((await studio.apply(planned.plan)).ok).toBe(true);
      });
      Then("{string} still has the line {string}", (_, path: string, line: string) => {
        expect(fs.snapshot()[path]).toContain("Try these.");
        expect(fs.snapshot()[path].split("\n")).toContain(line);
      });
    });
  });

  Rule('While an outcome has no lab tagged to it, the Studio shall mark it "Not yet practised" on the coverage map.', ({ RuleScenario }) => {
    RuleScenario("Taught but never practised", ({ Given, And, When, Then }) => {
      Given("the course's outcomes are written", outcomesWritten);
      And("the lecturer tagged {string} with {string}", tags);
      When("the lecturer asks for the outcomes", asks);
      Then("the command prints {string}", prints);
    });
  });

  Rule('If an outcome is assessed in a week before any week teaches it, then the Studio shall flag it "Assessed before it is taught" on the coverage map.', ({ RuleScenario }) => {
    RuleScenario("A quiz before the lecture", ({ Given, And, When, Then }) => {
      Given("the course's outcomes are written", outcomesWritten);
      And("the lecturer tagged {string}, {string} and {string} with {string}", async (_, a: string, b: string, c: string, ids: string) => {
        for (const item of [a, b, c]) await tags(_, item, ids);
      });
      When("the lecturer asks for the outcomes", asks);
      Then("the command prints {string}", prints);
      And("the command prints {string}", prints);
    });
  });

  Rule('While a course has outcomes and a week has nothing tagged, the Studio shall flag the week "Nothing tagged" on the coverage map.', ({ RuleScenario }) => {
    RuleScenario("A week that serves no outcome", ({ Given, And, When, Then }) => {
      Given("the course's outcomes are written", outcomesWritten);
      And("the lecturer tagged {string} with {string}", tags);
      When("the lecturer asks for the outcomes", asks);
      Then("the command prints {string}", prints);
      And("the command prints {string}", prints);
    });
  });

  Rule("Where a course has no outcomes written, the Studio shall show no coverage map and no flags about outcomes.", ({ RuleScenario }) => {
    RuleScenario("A course with no outcomes", ({ When, Then, And }) => {
      When("the lecturer asks for the outcomes", asks);
      Then("the command prints {string}", prints);
      And('no line says "Nothing tagged" or "Not yet practised"', () => expect(lines.join("\n")).not.toMatch(/Nothing tagged|Not yet practised/));
    });
  });

  Rule("The Studio shall keep outcomes so that Tutors builds and checks the course as it would without them.", ({ RuleScenario }) => {
    let findings: string[] = [];
    RuleScenario("The rules read the course the same", ({ Given, And, Then }) => {
      Given("the course's outcomes are written", async () => {
        findings = (await courseRules.validate(fs)).map((finding) => `${finding.rule} ${finding.path}`).sort();
        await outcomesWritten();
      });
      And("the lecturer tagged {string} and {string} with {string}", async (_, a: string, b: string, ids: string) => {
        for (const item of [a, b]) await tags(_, item, ids);
      });
      Then("the course's findings are the same as before the outcomes", async () =>
        expect((await courseRules.validate(fs)).map((finding) => `${finding.rule} ${finding.path}`).sort()).toEqual(findings),
      );
      And("each tagged item keeps its title", async () => {
        const tree = await courseRules.buildTree(fs);
        const titles = JSON.stringify(tree);
        expect(titles).toContain('"title":"First page"');
        expect(titles).toContain('"title":"How the web works"');
      });
    });
  });

  let claude: FakeClaude;
  let planned: ArrangePlan;
  const withClaude = () =>
    createAuthoring({
      fs,
      rules: courseRules,
      assistant: anthropicAssistant({ apiKey: "sk-ant-good", model: "claude-test", fetch: claude.fetch }),
      telemetry: new LocalTelemetry(),
      newId: () => "plan-1",
    });
  const unwritten = () => {
    expect(fs.snapshot()).toEqual(before);
  };

  Rule(
    "When a lecturer with an assistant chosen asks for outcomes from their module description, the Studio shall show the outcomes it suggests as a plan to accept.",
    ({ RuleScenario }) => {
      RuleScenario("Outcomes suggested by Claude", ({ Given, When, Then, And }) => {
        Given("Claude is chosen and answers with two outcomes, one at a level Bloom doesn't have", () => {
          claude = new FakeClaude(
            JSON.stringify({
              outcomes: [
                { text: "Students can explain how a web page is built", level: "Understand" },
                { text: "Students can juggle", level: "Juggle" },
              ],
            }),
          );
        });
        When("the lecturer asks for outcomes from {string}", async (_, description: string) => {
          before = fs.snapshot();
          planned = await withClaude().planOutcomeDraft(description);
        });
        Then("the plan adds {string} at {string} and nothing at the unknown level", (_, id: string, level: string) => {
          expect(planned.ok).toBe(true);
          if (!planned.ok) return;
          expect(planned.notes).toEqual([`${id} (${level}): Students can explain how a web page is built`]);
          expect(planned.plan.ops.map((op) => (op.op === "write" ? op.path : ""))).toEqual(["outcomes.yaml"]);
        });
        And("the module description is what Claude was sent", () => expect(claude.sent()).toContain("This module teaches HTML, CSS and forms."));
        And("nothing is written until the plan is accepted", unwritten);
      });
    },
  );

  Rule(
    "When a lecturer with an assistant chosen asks which outcomes a week's items serve, the Studio shall show the tags it suggests as one plan to accept.",
    ({ RuleScenario }) => {
      RuleScenario("Week 1 tagged by Claude", ({ Given, And, When, Then }) => {
        Given("the course's outcomes are written", outcomesWritten);
        And("Claude is chosen and says the lab in week 1 serves {string} and an outcome the course hasn't got", (_, id: string) => {
          claude = new FakeClaude(JSON.stringify({ items: [{ name: "lab-01", outcomes: [id, "LO99"], why: "It builds a form." }] }));
        });
        When("the lecturer asks which outcomes week 1's items serve", async () => {
          before = fs.snapshot();
          planned = await withClaude().planServesSuggestion("topic-01");
        });
        Then("the plan writes {string} to {string} and nothing else", (_, line: string, path: string) => {
          expect(planned.ok).toBe(true);
          if (!planned.ok) return;
          expect(planned.plan.ops.map((op) => (op.op === "write" ? op.path : ""))).toEqual([path]);
          const op = planned.plan.ops[0];
          expect(op.op === "write" ? new TextDecoder().decode(op.content).split("\n") : []).toContain(line);
        });
        And("nothing is written until the plan is accepted", unwritten);
      });
    },
  );
});
