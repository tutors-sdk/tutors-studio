import { mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { validate } from "@tutors/course-rules";
import { NodeFileSystem, nodeCourseFolder } from "../../src/adapters/fs/node/node-fs.ts";
import { nodeLibrary } from "../../src/adapters/library/node/node-library.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { runCompose, runHeadlessNew } from "../../src/adapters/cli/headless/headless.ts";

const feature = await loadFeature("spec/features/compose.feature");

/** Every file under a folder with its bytes, so a folder can be compared before and after. */
const snapshot = (root: string, dir = ""): string[] =>
  readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = dir === "" ? entry.name : `${dir}/${entry.name}`;
    return entry.isDirectory() ? snapshot(root, path) : [`${path}:${readFileSync(join(root, path), "utf8")}`];
  });

describeFeature(feature, ({ Background, Rule, AfterEachScenario }) => {
  let library: string;
  let parent: string;
  let lines: string[];
  let before: string[];

  AfterEachScenario(() => [library, parent].forEach((dir) => rmSync(dir, { recursive: true, force: true })));

  const made = (...parts: string[]) => join(parent, "mixed", ...parts);
  const compose = async (_: unknown, name: string, weeks: number, first: string, second: string) => {
    before = snapshot(library);
    let n = 0;
    await runCompose(
      { library: nodeLibrary, rules: courseRules, newId: () => `plan-${++n}`, today: () => "2026-11-25", makeFolder: nodeCourseFolder },
      [parent, "--name", name, "--weeks", String(weeks), "--from", library, "--pick", first, "--pick", second],
      (line) => lines.push(line),
    );
  };
  const printed = (_: unknown, line: string) => expect(lines).toContain(line);
  const composes = "the lecturer composes {string} over {int} weeks from {string} and {string}";

  Background(({ Given }) => {
    Given("a library folder holding a new course {string} at {string}", async (_, name: string, at: string) => {
      library = mkdtempSync(join(tmpdir(), "studio-compose-library-"));
      parent = mkdtempSync(join(tmpdir(), "studio-compose-made-"));
      lines = [];
      const scratch = mkdtempSync(join(tmpdir(), "studio-compose-new-"));
      let n = 0;
      await runHeadlessNew(
        (p) => ({ rules: courseRules, newId: () => `plan-${++n}`, makeFolder: nodeCourseFolder(p) }),
        [scratch, "--name", name, "--weeks", "2"],
        () => {},
      );
      mkdirSync(dirname(join(library, at)), { recursive: true });
      renameSync(join(scratch, readdirSync(scratch)[0]), join(library, at));
      rmSync(scratch, { recursive: true, force: true });
    });
  });

  Rule(
    "When a lecturer composes a course from their library, the Studio shall show one plan that copies each week and item they picked into the week they chose, numbered as Tutors reads it, and write nothing until they accept it.",
    ({ RuleScenario }) => {
      RuleScenario("A whole week and a lab from another week, into the same week", ({ When, Then, And }) => {
        When(composes, compose);
        Then("the command shall print {string}", printed);
        And("the new course shall hold {string} and {string}", (_, a: string, b: string) => {
          expect(readFileSync(made(a), "utf8")).not.toBe("");
          expect(readFileSync(made(b), "utf8")).not.toBe("");
        });
        And("week {int} shall be called {string}", (_, week: number, title: string) =>
          expect(readFileSync(made("unit-1", `topic-0${week}`, "topic.md"), "utf8").split("\n")).toContain(`# ${title}`),
        );
        And("the new course shall check with no errors", async () => {
          const findings = await validate(new NodeFileSystem(made()));
          expect(findings.filter((f) => f.severity === "error")).toEqual([]);
        });
        And("the library folder shall be as it was", () => expect(snapshot(library)).toEqual(before));
      });
    },
  );

  Rule("The Studio shall say, in every plan that composes a course, that it copies what was picked and that the copy and the original change separately.", ({ RuleScenario }) => {
    RuleScenario("The plan says it is a copy", ({ When, Then }) => {
      When(composes, compose);
      Then("the command shall also print a line starting {string}", (_, start: string) => expect(lines.some((line) => line.startsWith(start))).toBe(true));
    });
  });

  Rule(
    "The Studio shall record, for every item it copies from the library, the folder, course and path it came from and a digest of its files, in a file Tutors does not publish.",
    ({ RuleScenario }) => {
      RuleScenario("Where a lecture came from", ({ When, Then }) => {
        When(composes, compose);
        Then("the sources file shall say {string} came from {string} in {string} with a SHA-256 digest", (_, copy: string, path: string, course: string) => {
          const sources = JSON.parse(readFileSync(made(".tutors", "sources.json"), "utf8"));
          expect(sources[copy]).toMatchObject({ library, course, path, copied: "2026-11-25" });
          expect(sources[copy].digest).toMatch(/^sha256:[0-9a-f]{64}$/);
        });
      });
    },
  );

  Rule("When a lecturer composes a course, the Studio shall add a page to the module's own unit that lists each copied item and the course it came from.", ({ RuleScenario }) => {
    RuleScenario("The Borrowed material page", ({ When, Then }) => {
      When(composes, compose);
      Then("the module's unit shall hold a page {string} listing {string} from {string}", (_, title: string, item: string, from: string) => {
        const page = readdirSync(made("side")).find((name) => name.endsWith("-borrowed"));
        const text = readFileSync(made("side", page ?? "", "note.md"), "utf8");
        expect(text.split("\n")[0]).toBe(`# ${title}`);
        expect(text).toContain(`| ${item} | ${from} |`);
      });
    });
  });

  Rule("If a lecturer picks something from a course that needs fixing, then the Studio shall copy nothing and say the course needs fixing first.", ({ RuleScenario }) => {
    RuleScenario("A course with a problem", ({ Given, When, Then, And }) => {
      Given("the course at {string} has lost {string}", (_, at: string, path: string) => rmSync(join(library, at, path)));
      When(composes, compose);
      Then("the command shall print {string}", printed);
      And("no course shall have been made", () => expect(readdirSync(parent)).toEqual([]));
    });
  });
});
