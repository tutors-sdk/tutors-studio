import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { noAssistant } from "../../src/adapters/assistant/none/none-assistant.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "../../src/adapters/telemetry/local/local-telemetry.ts";
import { runHeadless } from "../../src/adapters/cli/headless/headless.ts";
import { createAuthoring } from "../../src/application/use-cases/authoring.ts";

const feature = await loadFeature("spec/features/rich-content.feature");

const base = {
  "course.md": "# Web Development\n",
  "netlify.toml": '[build]\n  publish = "json"\n',
  "topic-01/topic.md": "# Week one\n",
};
describeFeature(feature, ({ Rule }) => {
  let fs: MemoryFileSystem;
  let lines: string[];

  const run = async (command: string, target = "") => {
    lines = [];
    const authoring = createAuthoring({
      fs,
      rules: courseRules,
      assistant: noAssistant,
      telemetry: new LocalTelemetry(),
      newId: () => "plan-1",
    });
    await runHeadless(authoring, command, (line) => lines.push(line), target);
  };
  const checks = () => run("check");
  const printedFor = (_: unknown, path: string, text: string) => expect(lines.filter((line) => line.includes(`${path}:`)).join("\n")).toContain(text);

  Rule("When a lecturer opens a course with a quiz question the reader leaves out, the Studio shall name the question and say why it is left out.", ({ RuleScenario }) => {
    RuleScenario("A question with no right answer", ({ Given, When, Then }) => {
      Given("a course whose quiz has a second question with no right answer", () => {
        fs = new MemoryFileSystem({
          ...base,
          "topic-01/quiz-01/quiz.md":
            "# Week one quiz\n\n```quiz\nquestion: Which keyword declares a constant?\noptions:\n  - var\n  - const\ncorrect: 1\n---\nquestion: Which tag makes a link?\noptions:\n  - <a>\n  - <link>\n```\n",
        });
      });
      When("the lecturer checks the course", checks);
      Then("the command shall print a finding for {string} that says {string}", printedFor);
    });
  });
});
