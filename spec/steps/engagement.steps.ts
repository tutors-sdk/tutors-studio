import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { noAssistant } from "../../src/adapters/assistant/none/none-assistant.ts";
import { noEngagement } from "../../src/adapters/engagement/none/none-engagement.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "../../src/adapters/telemetry/local/local-telemetry.ts";
import { runHeadless } from "../../src/adapters/cli/headless/headless.ts";
import type { EngagementPort, WeekEngagement } from "../../src/application/ports/engagement.ts";
import { createAuthoring } from "../../src/application/use-cases/authoring.ts";

const feature = await loadFeature("spec/features/engagement.feature");

describeFeature(feature, ({ Background, Rule }) => {
  let fs: MemoryFileSystem;
  let engagement: EngagementPort;
  let figures: (WeekEngagement & { names?: string[] })[];
  let lines: string[];
  let printed: string[];
  const run = async (command: string) => {
    lines = [];
    let n = 0;
    const authoring = createAuthoring({ fs, rules: courseRules, assistant: noAssistant, telemetry: new LocalTelemetry(), newId: () => `plan-${++n}`, engagement });
    await runHeadless(authoring, command, (line) => lines.push(line));
    printed.push(...lines);
  };
  const prints = (_: unknown, line: string) => expect(lines, lines.join("\n")).toContain(line);

  Background(({ Given }) => {
    Given("a course with two weeks, {string} and {string}", (_, first: string, second: string) => {
      fs = new MemoryFileSystem({
        "course.md": "# Web Development\n",
        "course.png": "PNG",
        [`${first}/topic.md`]: "# Week 1\n",
        [`${first}/topic.png`]: "PNG",
        [`${second}/topic.md`]: "# Week 2\n",
        [`${second}/topic.png`]: "PNG",
      });
      figures = [];
      printed = [];
      engagement = { weeks: async () => figures };
    });
  });

  Rule("While no engagement adapter is bound, the Studio shall show no engagement figures and complete every journey.", ({ RuleScenario }) => {
    RuleScenario("Nothing reads engagement", ({ Given, When, Then }) => {
      Given("no engagement adapter is bound", () => {
        engagement = noEngagement;
      });
      When("the lecturer asks for engagement", () => run("engagement"));
      Then("the command prints {string}", prints);
      When("the lecturer fixes the course", () => run("fix"));
      Then("the course checks out", () => expect(lines.at(-1)).toBe("Everything checks out."));
    });
  });

  Rule(
    "While an engagement adapter has figures for a course, the Studio shall show beside each week how many students opened it and how long they spent, and no student's name.",
    ({ RuleScenario }) => {
      RuleScenario("Figures from Tutors' time data", ({ Given, And, When, Then }) => {
        Given("Tutors' time data says {int} students spent {int} minutes in {string}, naming {string}", (_, students: number, minutes: number, path: string, name: string) => {
          // An adapter that passed names along by mistake: Studio keeps only the counts.
          figures.push({ path, students, minutes, names: [name] });
        });
        And("Tutors' time data has figures for {string}, which the course no longer has", (_, path: string) => {
          figures.push({ path, students: 3, minutes: 10 });
        });
        When("the lecturer asks for engagement", () => run("engagement"));
        Then("the command prints {string}", prints);
        And("nothing printed names a student or {string}", (_, gone: string) => {
          expect(printed.join("\n")).not.toContain("Seán");
          expect(printed.join("\n")).not.toContain(gone);
        });
      });
    },
  );
});
