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
import { exampleCourses, type ExampleItem } from "../../src/domain/example-courses.ts";
import type { CourseFolder } from "../../src/domain/course-map.ts";

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
  const fromExample = async (_: unknown, name: string, example: string) => {
    folder = name.toLowerCase().replace(/\s+/g, "-");
    await run(["--name", name, "--example", example]);
  };
  const printed = (_: unknown, line: string) => expect(lines).toContain(line);
  const tree = () => courseRules.buildTree(new NodeFileSystem(course()));
  const stepsIn = (lab: CourseFolder) => lab.files.filter((file) => /^\d{2}\..+\.md$/.test(file.name)).length;
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
    "The Studio shall offer three ways to start a new course: a reference course picked from a list, the Lecture and lab template in 2, 4, 6, 8, 10 or 12 weeks, and a week the lecturer shapes.",
    ({ RuleScenario }) => {
      RuleScenario("The ways to start on offer", ({ When, Then, And }) => {
        When("the lecturer lists the templates", () => void runTemplates((line) => lines.push(line)));
        Then("there shall be the template {string} in {string} weeks", (_, id: string, lengths: string) => {
          const templates = lines.filter((line) => line.startsWith("--template "));
          expect(templates).toHaveLength(1);
          expect(templates[0].startsWith(`--template ${id}:`)).toBe(true);
          expect(templates[0].endsWith(`${lengths} weeks.`)).toBe(true);
        });
        And("there shall be the reference courses {string}", (_, ids: string) => {
          const examples = lines.filter((line) => line.startsWith("--example ")).map((line) => line.slice("--example ".length, line.indexOf(":")));
          expect(examples.join(", ")).toBe(ids);
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
      RuleScenario("Four weeks of lectures and labs", ({ Given, When, Then, And }) => {
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
    RuleScenario("An unknown reference course", ({ Given, When, Then, And }) => {
      Given("an empty place for the course", emptyPlace);
      When("the lecturer creates {string} from the {string} reference course", fromExample);
      Then("the command shall print {string}", printed);
      And("no folder shall have been made", () => expect(readdirSync(parent)).toEqual([]));
    });
  });

  Rule("When a lecturer opens a course made from a template, the Studio shall show every week as still to write.", ({ RuleScenario }) => {
    let states: Record<string, WeekState> = {};
    const opens = async () => {
      const authoring = createAuthoring({ fs: new NodeFileSystem(course()), rules: courseRules, assistant: noAssistant, telemetry: new LocalTelemetry(), newId: () => "plan-1" });
      states = await authoring.weekStates();
    };
    const stillToWrite = (_: unknown, count: number) => {
      expect(Object.keys(states)).toHaveLength(count);
      expect(new Set(Object.values(states))).toEqual(new Set(["not-written"]));
    };
    RuleScenario("A new lecture and lab course", ({ Given, When, Then, And }) => {
      Given("an empty place for the course", emptyPlace);
      When("the lecturer creates {string} from the {string} template for {int} weeks", creates);
      And("the lecturer opens the course", opens);
      Then("every one of the {int} weeks shall be still to write", stillToWrite);
    });
    RuleScenario("A new course from Web Development II", ({ Given, When, Then, And }) => {
      Given("an empty place for the course", emptyPlace);
      When("the lecturer creates {string} from the {string} reference course", fromExample);
      And("the lecturer opens the course", opens);
      Then("every one of the {int} weeks shall be still to write", stillToWrite);
    });
  });

  Rule(
    "When a lecturer names a course and picks a reference course, the Studio shall create a course that checks with no errors and holds every week, unit, item and lab step of the course it is shaped on, titled as that course titles them.",
    ({ RuleScenario }) => {
      RuleScenario("Every reference course checks clean and keeps its shape", ({ Given, When, Then, And }) => {
        Given("an empty place for the course", emptyPlace);
        When("the lecturer creates a course from every reference course", async () => {
          for (const example of exampleCourses) await run(["--name", example.id, "--example", example.id]);
          expect(lines).toEqual(exampleCourses.map((example) => `Created ${example.id}.`));
        });
        Then("every course shall check with no errors", async () => {
          for (const example of exampleCourses) {
            const findings = await validate(new NodeFileSystem(join(parent, example.id)));
            expect({ example: example.id, findings: findings.filter((f) => f.severity !== "info") }).toEqual({ example: example.id, findings: [] });
          }
        });
        And("every course shall hold each week, unit, item and lab step of the course it is shaped on, by title", async () => {
          // Every card as kind and title, with a lab's step count, sorted: the course made and the course it is shaped on.
          const card = (kind: string, title: string, steps?: number) => (steps === undefined ? `${kind}: ${title}` : `${kind}: ${title} (${steps} steps)`);
          const fromItem = (item: ExampleItem) => card(item.kind, item.title, item.kind === "lab" ? (item.steps?.length ?? 0) + 1 : undefined);
          for (const example of exampleCourses) {
            folder = example.id;
            const made: string[] = [];
            const walk = (node: CourseFolder) => {
              for (const child of node.children) {
                if (child.kind === null) continue;
                made.push(card(child.kind, child.title ?? "", child.kind === "lab" ? stepsIn(child) : undefined));
                walk(child);
              }
            };
            walk(await tree());
            const expected = [
              ...example.home.map(fromItem),
              ...example.side.flatMap((unit) => [card("side", unit.title), ...unit.items.map(fromItem)]),
              ...example.weeks.flatMap((week) => [
                card("topic", week.title),
                ...week.items.map(fromItem),
                ...week.units.flatMap((unit) => [card(unit.side ? "side" : "unit", unit.title), ...unit.items.map(fromItem)]),
              ]),
            ];
            expect({ example: example.id, cards: made.sort() }).toEqual({ example: example.id, cards: expected.sort() });
          }
        });
      });
      RuleScenario("Week 1 of Web Development II", ({ Given, When, Then, And }) => {
        Given("an empty place for the course", emptyPlace);
        When("the lecturer creates {string} from the {string} reference course", fromExample);
        let week: CourseFolder;
        Then("the week {int} shall be titled {string}", async (_, n: number, title: string) => {
          week = (await tree()).children.filter((child) => child.kind === "topic")[n - 1];
          expect(week.title).toBe(title);
        });
        And("its unit {string} shall hold the lab {string} with {int} steps and the talks {string}", (_, unitTitle: string, labTitle: string, steps: number, talks: string) => {
          const unit = week.children.find((child) => child.kind === "unit" && child.title === unitTitle)!;
          const lab = unit.children.find((child) => child.kind === "lab")!;
          expect(lab.title).toBe(labTitle);
          expect(stepsIn(lab)).toBe(steps);
          expect(unit.children.filter((child) => child.kind === "talk").map((child) => child.title)).toEqual(talks.split("; "));
        });
      });
    },
  );
});
