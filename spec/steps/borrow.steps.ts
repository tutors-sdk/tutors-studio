import { mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { validate } from "@tutors/course-rules";
import { NodeFileSystem, nodeCourseFolder } from "../../src/adapters/fs/node/node-fs.ts";
import { nodeLibrary } from "../../src/adapters/library/node/node-library.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { runBorrow, runHeadlessNew } from "../../src/adapters/cli/headless/headless.ts";
import { borrowPlaces } from "../../src/domain/borrow.ts";
import { buildCourseMap } from "../../src/domain/course-map.ts";

const feature = await loadFeature("spec/features/borrow.feature");

/** Every file under a folder with its bytes, so a folder can be compared before and after. */
const snapshot = (root: string, dir = ""): string[] =>
  readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = dir === "" ? entry.name : `${dir}/${entry.name}`;
    return entry.isDirectory() ? snapshot(root, path) : [`${path}:${readFileSync(join(root, path), "utf8")}`];
  });

/** A course Studio makes (weeks of a lecture and a lab), at `at`. */
async function newCourse(name: string, weeks: number, at: string) {
  const scratch = mkdtempSync(join(tmpdir(), "studio-borrow-new-"));
  let n = 0;
  await runHeadlessNew(
    (p) => ({ rules: courseRules, newId: () => `plan-${++n}`, makeFolder: nodeCourseFolder(p) }),
    [scratch, "--name", name, "--weeks", String(weeks)],
    () => {},
  );
  mkdirSync(dirname(at), { recursive: true });
  renameSync(join(scratch, readdirSync(scratch)[0]), at);
  rmSync(scratch, { recursive: true, force: true });
}

describeFeature(feature, ({ Background, Rule, AfterEachScenario }) => {
  let library: string;
  let mine: string;
  let lines: string[];
  let before: string[];

  AfterEachScenario(() => [library, mine].forEach((dir) => rmSync(dir, { recursive: true, force: true })));

  const course = () => join(mine, "mobile");
  const borrows = async (_: unknown, first: string, second: string) => {
    before = snapshot(library);
    let n = 0;
    const code = await runBorrow(
      { library: nodeLibrary, rules: courseRules, newId: () => `plan-${++n}`, today: () => "2026-11-28", course: (folder) => new NodeFileSystem(folder) },
      [course(), "--from", library, "--pick", first, "--pick", second],
      (line) => lines.push(line),
    );
    expect(code, lines.join("\n")).toBe(0);
  };
  const BORROWS = "the lecturer borrows {string} and {string} into {string}";
  const holds = (_: unknown, _course: string, a: string, b: string) => {
    expect(readFileSync(join(course(), a), "utf8")).not.toBe("");
    expect(readFileSync(join(course(), b), "utf8")).not.toBe("");
  };
  const checks = async () => {
    const findings = await validate(new NodeFileSystem(course()));
    expect(findings.filter((f) => f.severity === "error")).toEqual([]);
  };
  const places = async (kind: string) => {
    const fs = new NodeFileSystem(course());
    const map = buildCourseMap(await courseRules.buildTree(fs), await courseRules.validate(fs));
    return borrowPlaces(map, kind).map((place) => place.label);
  };

  Background(({ Given, And }) => {
    Given("a library folder holding a new course {string} at {string}", async (_, name: string, at: string) => {
      library = mkdtempSync(join(tmpdir(), "studio-borrow-library-"));
      mine = mkdtempSync(join(tmpdir(), "studio-borrow-mine-"));
      lines = [];
      await newCourse(name, 2, join(library, at));
    });
    And("a course of my own, {string}, with {int} weeks", (_, name: string, weeks: number) => newCourse(name, weeks, course()));
  });

  Rule(
    "While a course is open, the Studio shall let the lecturer pick units, weeks and items from ready library courses and choose where each goes in that course: a new week or unit at its end, a unit's next week, a week, or the module's own unit.",
    ({ RuleScenario }) => {
      RuleScenario("Where a week can go, and where a lab can go", ({ Then, And }) => {
        Then("a week can go in {string}, {string}, {string} and {string}", async (_, a: string, b: string, c: string, d: string) =>
          expect(await places("topic")).toEqual([a, b, c, d]),
        );
        And("a lab can go in {string}, {string} and the module's own unit", async (_, a: string, b: string) => {
          const labels = await places("lab");
          expect(labels.slice(0, 2)).toEqual([a, b]);
          expect(labels.slice(2)).toEqual(["Module (the module's own unit)"]);
        });
        And("a unit can go only in {string}", async (_, only: string) => expect(await places("unit")).toEqual([only]));
      });
    },
  );

  Rule(
    "When the lecturer adds library picks to an open course, the Studio shall show one plan that copies each into the course's folder under the next free number of its kind, saying that it copies, and write nothing until the lecturer accepts it.",
    ({ RuleScenario }) => {
      RuleScenario("A week as the unit's next week, and a lab into week 1", ({ When, Then, And }) => {
        When(BORROWS, borrows);
        Then("the command shall print {string}", (_, line: string) => expect(lines).toContain(line));
        And("the command shall also print a line starting {string}", (_, start: string) => expect(lines.some((line) => line.startsWith(start))).toBe(true));
        And("{string} shall hold {string} and {string}", holds);
        And("{string} shall check with no errors", checks);
        And("the library folder shall be as it was", () => expect(snapshot(library)).toEqual(before));
      });
      RuleScenario("A whole unit at the end of the course", ({ When, Then, And }) => {
        When(BORROWS, borrows);
        Then("{string} shall hold {string} and {string}", holds);
        And("{string} shall check with no errors", checks);
      });
    },
  );

  Rule(
    "When the Studio copies library picks into a course, the Studio shall add each to the course's record of where its copies came from and write its Borrowed material page again, keeping what was borrowed before.",
    ({ RuleScenario }) => {
      RuleScenario("Borrowing twice", ({ When, And, Then }) => {
        When(BORROWS, borrows);
        And(BORROWS, borrows);
        Then("the sources file of {string} shall list {int} copies", (_, _course: string, copies: number) =>
          expect(Object.keys(JSON.parse(readFileSync(join(course(), ".tutors", "sources.json"), "utf8")))).toHaveLength(copies),
        );
        And("{string} shall have one Borrowed material page, listing {string} and {string}", (_, _course: string, a: string, b: string) => {
          const pages = readdirSync(join(course(), "side")).filter((name) => name.endsWith("-borrowed"));
          expect(pages).toHaveLength(1);
          const text = readFileSync(join(course(), "side", pages[0], "note.md"), "utf8");
          expect(text).toContain(`| ${a} |`);
          expect(text).toContain(`| ${b} |`);
        });
      });
    },
  );
});
