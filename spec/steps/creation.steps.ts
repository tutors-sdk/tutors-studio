import { existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { validate } from "@tutors/course-rules";
import { NodeFileSystem, nodeCourseFolder } from "../../src/adapters/fs/node/node-fs.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { runHeadlessNew } from "../../src/adapters/cli/headless/headless.ts";

const feature = await loadFeature("spec/features/creation.feature");

describeFeature(feature, ({ Rule, BeforeEachScenario, AfterEachScenario }) => {
  let parent: string;
  let lines: string[];

  BeforeEachScenario(() => {
    parent = mkdtempSync(join(tmpdir(), "studio-new-"));
    lines = [];
  });
  AfterEachScenario(() => rmSync(parent, { recursive: true, force: true }));

  const run = async (args: string[]) => {
    let n = 0;
    await runHeadlessNew(
      (folder) => ({ rules: courseRules, newId: () => `plan-${++n}`, makeFolder: nodeCourseFolder(folder) }),
      [parent, ...args],
      (line) => lines.push(line),
    );
  };
  const course = (...parts: string[]) => join(parent, "web-development", ...parts);
  const emptyPlace = () => {};
  const creates = (_: unknown, name: string, weeks: number) => run(["--name", name, "--weeks", String(weeks)]);
  const printed = (_: unknown, line: string) => expect(lines).toContain(line);
  const topics = () => readdirSync(course("unit-1")).filter((name) => name.startsWith("topic-"));
  const checksClean = async () => {
    const findings = await validate(new NodeFileSystem(course()));
    expect(findings.filter((f) => f.severity === "error")).toEqual([]);
  };
  /** The titles of what sits in the side unit, beside the weeks: each item's first heading. */
  const beside = (_: unknown, titles: string) => {
    const items = readdirSync(course("side")).filter((name) => !name.includes("."));
    const titleOf = (dir: string) => {
      const page = readdirSync(course("side", dir)).find((file) => file.endsWith(".md"))!;
      return /^# (.+)$/m.exec(readFileSync(course("side", dir, page), "utf-8"))?.[1] ?? "";
    };
    expect(items.map(titleOf).sort()).toEqual(titles.split(", "));
  };

  Rule(
    "When a lecturer names a course and says how many weeks it runs, the Studio shall create a course that checks with no errors, with one undated topic per week and no calendar.",
    ({ RuleScenario }) => {
      RuleScenario("Four weeks of a lecture and a lab", ({ Given, When, Then, And }) => {
        Given("an empty place for the course", emptyPlace);
        When("the lecturer creates {string} for {int} weeks", creates);
        Then("the command shall print {string}", printed);
        And("the course shall have {int} topics", (_, count: number) => expect(topics()).toHaveLength(count));
        And("no topic shall carry a date", () => {
          for (const topic of topics()) expect(readFileSync(course("unit-1", topic, "topic.md"), "utf-8")).not.toMatch(/Week of|\b20\d\d\b/);
        });
        And("the course shall have no calendar", () => expect(existsSync(course("calendar.yaml"))).toBe(false));
        And("beside the weeks shall be {string}", beside);
        And("the new course shall check with no errors", checksClean);
      });
    },
  );

  Rule("Where the lecturer says students build a project, the Studio shall put a project specification and starter code beside the weeks.", ({ RuleScenario }) => {
    RuleScenario("A project across the weeks", ({ Given, When, Then, And }) => {
      Given("an empty place for the course", emptyPlace);
      When("the lecturer creates {string} for {int} weeks with a project", (_, name: string, weeks: number) => run(["--name", name, "--weeks", String(weeks), "--project"]));
      Then("beside the weeks shall be {string}", beside);
      And("the new course shall check with no errors", checksClean);
    });
  });

  Rule("If an answer is missing or out of range, then the Studio shall name each answer to change and create nothing.", ({ RuleScenario }) => {
    RuleScenario("No name and too many weeks", ({ Given, When, Then, And }) => {
      Given("an empty place for the course", emptyPlace);
      When("the lecturer creates a course with no name for {int} weeks", (_, weeks: number) => run(["--weeks", String(weeks)]));
      Then("the command shall print {string}", printed);
      And("the command shall also print {string}", printed);
      And("no folder shall have been made", () => expect(readdirSync(parent)).toEqual([]));
    });
  });

  Rule("If the new course's folder already exists, then the Studio shall leave that folder as it was and say that nothing was created.", ({ RuleScenario }) => {
    RuleScenario("A folder called web-development is already there", ({ Given, When, Then, And }) => {
      Given("a folder {string} already holding {string}", (_, folder: string, file: string) => {
        mkdirSync(join(parent, folder));
        writeFileSync(join(parent, folder, file), "mine");
      });
      When("the lecturer creates {string} for {int} weeks", creates);
      Then("the command shall print a line starting {string}", (_, start: string) => expect(lines.some((line) => line.startsWith(start))).toBe(true));
      And("the folder {string} shall hold only {string}", (_, folder: string, file: string) => {
        expect(readdirSync(join(parent, folder))).toEqual([file]);
        expect(readFileSync(join(parent, folder, file), "utf-8")).toBe("mine");
      });
    });
  });

  const shaped = (_: unknown, name: string, weeks: number, lectures: number, labs: number, readings: number) =>
    run(["--name", name, "--weeks", String(weeks), "--lectures", String(lectures), "--labs", String(labs), "--readings", String(readings)]);

  Rule("When a lecturer says how many lectures, labs and readings a teaching week holds, the Studio shall create every weekly topic holding exactly those.", ({ RuleScenario }) => {
    RuleScenario("Two lectures, a lab and a reading every week", ({ Given, When, Then, And }) => {
      Given("an empty place for the course", emptyPlace);
      When("the lecturer creates {string} for {int} weeks with {int} lectures, {int} lab and {int} reading a week", shaped);
      Then("the command shall print {string}", printed);
      And("the topic for week {int} shall hold {string}", (_, week: number, list: string) =>
        expect(
          readdirSync(course("unit-1", topics()[week - 1]))
            .filter((name) => !name.includes("."))
            .sort(),
        ).toEqual(list.split(", ")),
      );
      And("the new course shall check with no errors", checksClean);
    });
  });

  Rule("If the week a lecturer shapes would hold nothing, or more than five of one kind, then the Studio shall say what to change and create nothing.", ({ RuleScenario }) => {
    RuleScenario("An empty week", ({ Given, When, Then, And }) => {
      Given("an empty place for the course", emptyPlace);
      When("the lecturer creates {string} for {int} weeks with {int} lectures, {int} labs and {int} readings a week", shaped);
      Then("the command shall print {string}", printed);
      And("no folder shall have been made", () => expect(readdirSync(parent)).toEqual([]));
    });
  });
});
