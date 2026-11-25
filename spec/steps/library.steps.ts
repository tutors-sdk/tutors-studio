import { mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { nodeCourseFolder } from "../../src/adapters/fs/node/node-fs.ts";
import { nodeLibrary } from "../../src/adapters/library/node/node-library.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { runHeadlessNew, runLibrary } from "../../src/adapters/cli/headless/headless.ts";

const feature = await loadFeature("spec/features/library.feature");

/** Every file under a folder with its bytes, so a folder can be compared before and after. */
const snapshot = (root: string, dir = ""): string[] =>
  readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = dir === "" ? entry.name : `${dir}/${entry.name}`;
    return entry.isDirectory() ? snapshot(root, path) : [`${path}:${readFileSync(join(root, path), "utf8")}`];
  });

describeFeature(feature, ({ Rule, BeforeEachScenario, AfterEachScenario }) => {
  let library: string;
  let scratch: string;
  let lines: string[];
  let before: string[];

  BeforeEachScenario(() => {
    library = mkdtempSync(join(tmpdir(), "studio-library-"));
    scratch = mkdtempSync(join(tmpdir(), "studio-library-made-"));
    lines = [];
  });
  AfterEachScenario(() => [library, scratch].forEach((dir) => rmSync(dir, { recursive: true, force: true })));

  /** A course Studio makes (two weeks of a lecture and a lab), moved to a place in the library folder. */
  const course = async (name: string, at: string) => {
    let n = 0;
    await runHeadlessNew(
      (parent) => ({ rules: courseRules, newId: () => `plan-${++n}`, makeFolder: nodeCourseFolder(parent) }),
      [scratch, "--name", name, "--weeks", "2"],
      () => {},
    );
    const made = readdirSync(scratch)[0];
    mkdirSync(dirname(join(library, at)), { recursive: true });
    renameSync(join(scratch, made), join(library, at));
    before = snapshot(library);
  };
  const search = async (...args: string[]) => {
    await runLibrary({ library: nodeLibrary, rules: courseRules }, [library, ...args], (line) => lines.push(line));
  };
  const printed = (_: unknown, line: string) => expect(lines).toContain(line);
  const summary = (_: unknown, line: string) => expect(lines.at(-1)).toBe(line);
  const startsWith = (_: unknown, start: string) => expect(lines.some((line) => line.startsWith(start))).toBe(true);
  const twoCourses = async (_: unknown, a: string, atA: string, b: string, atB: string) => {
    await course(a, atA);
    await course(b, atB);
  };
  const broken = async (_: unknown, name: string, at: string, missing: string) => {
    await course(name, at);
    rmSync(join(library, at, missing));
    before = snapshot(library);
  };

  Rule(
    "When a lecturer adds a library folder, the Studio shall list every Tutors course in it and in the folders below it, and check each with the course rules.",
    ({ RuleScenario }) => {
      RuleScenario("Two courses at different depths", ({ Given, When, Then, And }) => {
        Given("a library folder holding a new course {string} at {string} and a new course {string} at {string}", twoCourses);
        When("the lecturer searches the library", () => search());
        Then("the command shall print {string}", printed);
        And("the command shall also print {string}", printed);
        And("the summary shall be {string}", summary);
      });
    },
  );

  Rule("The Studio shall treat a folder holding a course.md as one course, and never as a folder of more courses.", ({ RuleScenario }) => {
    RuleScenario("A course with a copy of another course inside it", ({ Given, When, Then }) => {
      Given("a library folder holding a new course {string} at {string} and a new course {string} at {string}", twoCourses);
      When("the lecturer searches the library", () => search());
      Then("the summary shall be {string}", summary);
    });
  });

  Rule("While a course in a library folder has an error finding, the Studio shall show it as needing fixes and lend none of its items to another course.", ({ RuleScenario }) => {
    RuleScenario("A course with no descriptor for its topic", ({ Given, When, Then, And }) => {
      Given("a library folder holding a new course {string} at {string} whose {string} is missing", broken);
      When("the lecturer searches the library for items", () => search("--items"));
      Then("the command shall print a line starting {string}", startsWith);
      And("the command shall list no items", () => expect(lines.filter((line) => line.startsWith("  "))).toEqual([]));
    });
  });

  Rule("The Studio shall change nothing in a library folder.", ({ RuleScenario }) => {
    RuleScenario("Searching leaves every file as it was", ({ Given, When, Then }) => {
      Given("a library folder holding a new course {string} at {string} whose {string} is missing", broken);
      When("the lecturer searches the library for items", () => search("--items"));
      Then("the library folder shall be as it was", () => expect(snapshot(library)).toEqual(before));
    });
  });

  Rule("If a library folder can't be read, then the Studio shall name it, say why, and still list the courses in the other folders.", ({ RuleScenario }) => {
    RuleScenario("One folder is gone", ({ Given, When, Then, And }) => {
      Given("a library folder holding a new course {string} at {string}", (_, name: string, at: string) => course(name, at));
      When("the lecturer searches the library and a folder that isn't there", () => search(join(library, "gone")));
      Then("the command shall print a line starting {string}", startsWith);
      And("the summary shall be {string}", summary);
    });
  });
});
