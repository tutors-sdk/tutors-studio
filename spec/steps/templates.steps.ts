import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { validate } from "@tutors/course-rules";
import { NodeFileSystem, nodeCourseFolder } from "../../src/adapters/fs/node/node-fs.ts";
import { noAssistant } from "../../src/adapters/assistant/none/none-assistant.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "../../src/adapters/telemetry/local/local-telemetry.ts";
import { runHeadlessNew, runTemplates } from "../../src/adapters/cli/headless/headless.ts";
import { createAuthoring } from "../../src/application/use-cases/authoring.ts";
import type { WeekState } from "../../src/domain/course-map.ts";
import { courseTemplates, TEMPLATE_LENGTHS } from "../../src/domain/templates.ts";

const feature = await loadFeature("spec/features/templates.feature");

describeFeature(feature, ({ Rule, BeforeEachScenario, AfterEachScenario }) => {
  let parent: string;
  let lines: string[];
  let folder: string;

  BeforeEachScenario(() => {
    parent = mkdtempSync(join(tmpdir(), "studio-template-"));
    lines = [];
    folder = "";
  });
  AfterEachScenario(() => rmSync(parent, { recursive: true, force: true }));

  const run = async (args: string[]) => {
    let n = 0;
    await runHeadlessNew(
      (at) => ({ rules: courseRules, newId: () => `plan-${++n}`, makeFolder: nodeCourseFolder(at) }),
      [parent, ...args],
      (line) => lines.push(line),
    );
  };
  const course = (...parts: string[]) => join(parent, folder, ...parts);
  const emptyPlace = () => {};
  const creates = async (_: unknown, name: string, template: string, weeks: number) => {
    folder = name.toLowerCase().replace(/\s+/g, "-");
    await run(["--name", name, "--template", template, "--weeks", String(weeks)]);
  };
  const printed = (_: unknown, line: string) => expect(lines).toContain(line);
  const folders = (...parts: string[]) =>
    readdirSync(course(...parts))
      .filter((name) => !name.includes("."))
      .sort();
  const units = () => folders().filter((name) => name.startsWith("unit-"));
  const weeks = () => units().flatMap((unit) => folders(unit).map((topic) => [unit, topic]));
  const weekHolds = (_: unknown, week: number, list: string) => expect(folders(...weeks()[week - 1])).toEqual(list.split(", "));
  const titleOf = (...parts: string[]) => {
    const page = readdirSync(course(...parts)).find((file) => file.endsWith(".md"))!;
    const text = readFileSync(course(...parts, page), "utf-8");
    return /^# (.+)$/m.exec(text)?.[1] ?? text.split("\n")[0];
  };

  Rule(
    "The Studio shall offer a starter template for each kind of module, each modelled on a topic of the Tutors reference course and each in 2, 4, 6, 8, 10 and 12 week lengths.",
    ({ RuleScenario }) => {
      RuleScenario("The templates on offer", ({ When, Then, And }) => {
        When("the lecturer lists the templates", () => void runTemplates((line) => lines.push(line)));
        Then("there shall be {int} templates: {string}", (_, count: number, ids: string) => {
          expect(lines).toHaveLength(count);
          expect(lines.map((line) => line.slice(0, line.indexOf(":"))).join(", ")).toBe(ids);
        });
        And("each shall name the reference course topic it is modelled on", () => {
          for (const line of lines) expect(line).toMatch(/Modelled on the reference course's .+ topic\./);
        });
        And("each shall come in {string} weeks", (_, lengths: string) => {
          for (const line of lines) expect(line.endsWith(`${lengths} weeks.`)).toBe(true);
        });
      });
    },
  );

  Rule(
    "When a lecturer names a course and picks a template and a length, the Studio shall create a course that checks with no errors, with one week per teaching week holding what the template's week holds.",
    ({ RuleScenario }) => {
      RuleScenario("Every template at every length checks clean", ({ Given, When, Then }) => {
        const made: string[] = [];
        Given("an empty place for the course", emptyPlace);
        When("the lecturer creates a course from every template at every length", async () => {
          for (const template of courseTemplates)
            for (const length of TEMPLATE_LENGTHS) {
              await run(["--name", `${template.id} ${length}`, "--template", template.id, "--weeks", String(length)]);
              made.push(`${template.id}-${length}`);
            }
          expect(lines).toEqual(made.map((name) => `Created ${name}.`));
        });
        Then("every course shall check with no errors", async () => {
          for (const name of made) {
            const findings = await validate(new NodeFileSystem(join(parent, name)));
            expect({ name, findings: findings.filter((f) => f.severity !== "info") }).toEqual({ name, findings: [] });
          }
        });
      });
      RuleScenario("Four weeks of seminars", ({ Given, When, Then, And }) => {
        Given("an empty place for the course", emptyPlace);
        When("the lecturer creates {string} from the {string} template for {int} weeks", creates);
        Then("the command shall print {string}", printed);
        And("the course shall have {int} weeks", (_, count: number) => expect(weeks()).toHaveLength(count));
        And("the week {int} shall hold {string}", weekHolds);
        And("beside the weeks shall be {string}", (_, titles: string) => expect(folders("side").map((item) => titleOf("side", item))).toEqual(titles.split(", ")));
      });
    },
  );

  Rule("When a lecturer picks a template of six weeks or more, the Studio shall group the weeks into sections and make the last week a review with a quiz.", ({ RuleScenario }) => {
    const sections = (_: unknown, list: string) => expect(units().map((unit) => readFileSync(course(unit, "unit.md"), "utf-8").split("\n")[0])).toEqual(list.split(", "));
    RuleScenario("Twelve weeks of lectures and labs", ({ Given, When, Then, And }) => {
      Given("an empty place for the course", emptyPlace);
      When("the lecturer creates {string} from the {string} template for {int} weeks", creates);
      Then("the course shall have sections {string}", sections);
      And("the week {int} shall hold {string}", weekHolds);
      And("week {int} shall still hold {string}", weekHolds);
    });
    RuleScenario("Two weeks stay in one section, with no review", ({ Given, When, Then, And }) => {
      Given("an empty place for the course", emptyPlace);
      When("the lecturer creates {string} from the {string} template for {int} weeks", creates);
      Then("the course shall have sections {string}", sections);
      And("the week {int} shall hold {string}", weekHolds);
    });
  });

  Rule("If the template or the length a lecturer asks for is not one Studio offers, then the Studio shall name each answer to change and create nothing.", ({ RuleScenario }) => {
    RuleScenario("An unknown template for five weeks", ({ Given, When, Then, And }) => {
      Given("an empty place for the course", emptyPlace);
      When("the lecturer creates {string} from the {string} template for {int} weeks", creates);
      Then("the command shall print {string}", printed);
      And("the command shall also print {string}", printed);
      And("no folder shall have been made", () => expect(readdirSync(parent)).toEqual([]));
    });
  });

  Rule("When a lecturer opens a course made from a template, the Studio shall show every week as still to write.", ({ RuleScenario }) => {
    RuleScenario("A new practical-led course", ({ Given, When, Then, And }) => {
      let states: Record<string, WeekState> = {};
      Given("an empty place for the course", emptyPlace);
      When("the lecturer creates {string} from the {string} template for {int} weeks", creates);
      And("the lecturer opens the course", async () => {
        const authoring = createAuthoring({ fs: new NodeFileSystem(course()), rules: courseRules, assistant: noAssistant, telemetry: new LocalTelemetry(), newId: () => "plan-1" });
        states = await authoring.weekStates();
      });
      Then("every one of the {int} weeks shall be still to write", (_, count: number) => {
        expect(Object.keys(states)).toHaveLength(count);
        expect(new Set(Object.values(states))).toEqual(new Set(["not-written"]));
      });
    });
  });
});
