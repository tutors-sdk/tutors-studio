import { mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { validate } from "@tutors/course-rules";
import { NodeFileSystem, nodeCourseFolder } from "../../src/adapters/fs/node/node-fs.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { runHeadlessLoad } from "../../src/adapters/cli/headless/headless.ts";

const feature = await loadFeature("spec/features/loading.feature");

/** Every file under a folder, relative to it, so a folder can be compared before and after. */
const tree = (root: string, dir = ""): string[] =>
  readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = dir === "" ? entry.name : `${dir}/${entry.name}`;
    return entry.isDirectory() ? tree(root, path) : [path];
  });

describeFeature(feature, ({ Rule, BeforeEachScenario, AfterEachScenario }) => {
  let source: string;
  let parent: string;
  let lines: string[];
  let before: string[];

  BeforeEachScenario(() => {
    source = mkdtempSync(join(tmpdir(), "studio-material-"));
    parent = mkdtempSync(join(tmpdir(), "studio-courses-"));
    lines = [];
  });
  AfterEachScenario(() => [source, parent].forEach((dir) => rmSync(dir, { recursive: true, force: true })));

  const holding = (...paths: string[]) => {
    for (const path of paths) {
      mkdirSync(dirname(join(source, path)), { recursive: true });
      writeFileSync(join(source, path), path.endsWith(".pdf") ? "%PDF" : path.endsWith(".md") ? `# ${path.slice(path.lastIndexOf("/") + 1, -3)}\n` : "x");
    }
    before = tree(source);
  };
  const load = async (_: unknown, name: string) => {
    let n = 0;
    await runHeadlessLoad(
      new NodeFileSystem(source),
      (folder) => ({ rules: courseRules, newId: () => `plan-${++n}`, makeFolder: nodeCourseFolder(folder) }),
      [parent, "--name", name],
      (line) => lines.push(line),
    );
  };
  const printed = (_: unknown, line: string) => expect(lines).toContain(line);
  const startsWith = (_: unknown, start: string) => expect(lines.some((line) => line.startsWith(start))).toBe(true);
  const nothingMade = () => expect(readdirSync(parent)).toEqual([]);

  Rule("When a lecturer loads a folder that already holds a Tutors course, the Studio shall open it as it is and write nothing.", ({ RuleScenario }) => {
    RuleScenario("A folder with a course.md", ({ Given, When, Then, And }) => {
      Given("a folder holding {string} and {string}", (_, a: string, b: string) => holding(a, b));
      When("the lecturer loads it as {string}", load);
      Then("the command shall print {string}", printed);
      And("no course shall have been made", () => {
        nothingMade();
        expect(tree(source)).toEqual(before);
      });
    });
  });

  Rule(
    "When a lecturer loads a folder of their own material, the Studio shall create a new course with a topic for each week the names give, each recognised file in its own learning object, and leave the folder they loaded unchanged.",
    ({ RuleScenario }) => {
      RuleScenario("Two weeks of slides, a reading and a lab", ({ Given, When, Then, And }) => {
        Given("a folder holding {string}, {string}, {string}, {string} and {string}", (_, a: string, b: string, c: string, d: string, e: string) => holding(a, b, c, d, e));
        When("the lecturer loads it as {string}", load);
        Then("the command shall print {string}", printed);
        And("the course shall hold {string} and {string}", (_, a: string, b: string) => expect(tree(join(parent, "web-development"))).toEqual(expect.arrayContaining([a, b])));
        And("the command shall also print a line starting {string}", startsWith);
        And("the new course shall check with no errors", async () => {
          const findings = await validate(new NodeFileSystem(join(parent, "web-development")));
          expect(findings.filter((f) => f.severity === "error")).toEqual([]);
        });
        And("the folder loaded shall be as it was", () => expect(tree(source)).toEqual(before));
      });
    },
  );

  Rule("If a loaded folder holds nothing Studio can place in a week, then the Studio shall say what it looks for and create nothing.", ({ RuleScenario }) => {
    RuleScenario("A folder of spreadsheets", ({ Given, When, Then, And }) => {
      Given("a folder holding {string} and {string}", (_, a: string, b: string) => holding(a, b));
      When("the lecturer loads it as {string}", load);
      Then("the command shall print a line starting {string}", startsWith);
      And("no course shall have been made", nothingMade);
    });
  });
});
