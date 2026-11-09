import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { validate } from "@tutors/course-rules";
import { NodeFileSystem, nodeCourseFolder } from "../../src/adapters/fs/node/node-fs.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { runHeadlessNew } from "../../src/adapters/cli/headless/headless.ts";
import type { PatternCard } from "../../src/domain/new-course.ts";

const feature = await loadFeature("spec/features/creation.feature");

describeFeature(feature, ({ Rule, BeforeEachScenario, AfterEachScenario }) => {
  let parent: string;
  let lines: string[];
  let cards: PatternCard[];

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
  const emptyPlace = () => {};
  const createsDated = (_: unknown, name: string, start: string, weeks: number, reading: number, pattern: string) =>
    run(["--name", name, "--start", start, "--weeks", String(weeks), "--reading-week", String(reading), "--pattern", pattern]);
  const printed = (_: unknown, line: string) => expect(lines).toContain(line);
  const topics = () => readdirSync(join(parent, "web-development", "unit-1")).filter((name) => name.startsWith("topic-"));

  Rule("When a lecturer answers the three questions, the Studio shall create a course that checks with no errors, with one dated topic per teaching week.", ({ RuleScenario }) => {
    RuleScenario("Four weeks of lectures and labs, with a reading week after week 2", ({ Given, When, Then, And }) => {
      Given("an empty place for the course", emptyPlace);
      When("the lecturer creates {string} starting {string} for {int} weeks with a reading week after week {int}, taught as {string}", createsDated);
      Then("the command shall print {string}", printed);
      And("the course shall have {int} topics", (_, count: number) => expect(topics()).toHaveLength(count));
      And("the topic for week {int} shall read {string}", (_, week: number, text: string) =>
        expect(readFileSync(join(parent, "web-development", "unit-1", topics()[week - 1], "topic.md"), "utf-8")).toContain(text),
      );
      And("the new course shall check with no errors", async () => {
        const findings = await validate(new NodeFileSystem(join(parent, "web-development")));
        expect(findings.filter((f) => f.severity === "error")).toEqual([]);
      });
    });
  });

  Rule("If an answer is missing or out of range, then the Studio shall name each answer to change and create nothing.", ({ RuleScenario }) => {
    RuleScenario("No start date and too many weeks", ({ Given, When, Then, And }) => {
      Given("an empty place for the course", emptyPlace);
      When("the lecturer creates {string} with no start date for {int} weeks, taught as {string}", (_, name: string, weeks: number, pattern: string) =>
        run(["--name", name, "--weeks", String(weeks), "--pattern", pattern]),
      );
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
      When("the lecturer creates {string} starting {string} for {int} weeks with a reading week after week {int}, taught as {string}", createsDated);
      Then("the command shall print a line starting {string}", (_, start: string) => expect(lines.some((line) => line.startsWith(start))).toBe(true));
      And("the folder {string} shall hold only {string}", (_, folder: string, file: string) => {
        expect(readdirSync(join(parent, folder))).toEqual([file]);
        expect(readFileSync(join(parent, folder, file), "utf-8")).toBe("mine");
      });
    });
  });

  Rule("The Studio shall offer every teaching pattern from tutors-create as a card that shows what one week's topic holds.", ({ RuleScenario }) => {
    RuleScenario("The lecture and lab card", ({ When, Then, And }) => {
      When("the lecturer is asked how they teach the course", () => {
        cards = courseRules.patterns();
      });
      Then("there shall be a card for each of {string}", (_, ids: string) => expect(cards.map((card) => card.id)).toEqual(ids.split(", ")));
      And("the {string} card shall show a week holding {string}", (_, id: string, labels: string) =>
        expect(cards.find((card) => card.id === id)!.week.map((item) => item.label)).toEqual(labels.split(", ")),
      );
    });
  });

  const shaped = (_: unknown, name: string, start: string, weeks: number, lectures: number, labs: number, readings: number) =>
    run([
      "--name",
      name,
      "--start",
      start,
      "--weeks",
      String(weeks),
      "--pattern",
      "lecture-lab",
      "--lectures",
      String(lectures),
      "--labs",
      String(labs),
      "--readings",
      String(readings),
    ]);

  Rule("When a lecturer says how many lectures, labs and readings a teaching week holds, the Studio shall create every weekly topic holding exactly those.", ({ RuleScenario }) => {
    RuleScenario("Two lectures, a lab and a reading every week", ({ Given, When, Then, And }) => {
      Given("an empty place for the course", emptyPlace);
      When("the lecturer creates {string} starting {string} for {int} weeks with {int} lectures, {int} lab and {int} reading a week", shaped);
      Then("the command shall print {string}", printed);
      And("the topic for week {int} shall hold {string}", (_, week: number, list: string) =>
        expect(
          readdirSync(join(parent, "web-development", "unit-1", topics()[week - 1]))
            .filter((name) => !name.includes("."))
            .sort(),
        ).toEqual(list.split(", ")),
      );
      And("the new course shall check with no errors", async () => {
        const findings = await validate(new NodeFileSystem(join(parent, "web-development")));
        expect(findings.filter((f) => f.severity === "error")).toEqual([]);
      });
    });
  });

  Rule("If the week a lecturer shapes would hold nothing, or more than five of one kind, then the Studio shall say what to change and create nothing.", ({ RuleScenario }) => {
    RuleScenario("An empty week", ({ Given, When, Then, And }) => {
      Given("an empty place for the course", emptyPlace);
      When("the lecturer creates {string} starting {string} for {int} weeks with {int} lectures, {int} labs and {int} readings a week", shaped);
      Then("the command shall print {string}", printed);
      And("no folder shall have been made", () => expect(readdirSync(parent)).toEqual([]));
    });
  });
});
