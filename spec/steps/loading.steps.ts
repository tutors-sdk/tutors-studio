import { mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { validate } from "@tutors/course-rules";
import { NodeFileSystem, nodeCourseFolder } from "../../src/adapters/fs/node/node-fs.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { runHeadlessLoad } from "../../src/adapters/cli/headless/headless.ts";
import { cartridge, moodleBackup } from "../../tests/support/course-exports.ts";

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
  const holdingExport = (path: string, bytes: Uint8Array) => {
    mkdirSync(dirname(join(source, path)), { recursive: true });
    writeFileSync(join(source, path), bytes);
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

  Rule(
    "When a lecturer loads a folder holding a course exported from Moodle (.mbz) or another learning platform (.imscc), the Studio shall make a week of each of its sections with its files, links and pages, and leave what belongs to no week in the tray.",
    ({ RuleScenario }) => {
      RuleScenario("A Moodle backup", ({ Given, When, Then, And }) => {
        Given(
          "a folder holding a Moodle backup {string} whose General section has {string}, whose {string} section has {string} and a link, and whose {string} section has {string} and a page",
          (_, name: string, general: string, first: string, lecture1: string, second: string, lecture2: string) =>
            holdingExport(
              name,
              moodleBackup([
                { title: "General", things: [{ resource: "Handbook", file: general }, { forum: "Announcements" }] },
                {
                  title: first,
                  things: [
                    { resource: "Lecture 1", file: lecture1 },
                    { url: "Course site", href: "https://example.org/web-dev" },
                  ],
                },
                {
                  title: second,
                  things: [
                    { resource: "Lecture 2", file: lecture2 },
                    { page: "Reading", html: "<p>Read chapter 3.</p>" },
                  ],
                },
              ]),
            ),
        );
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
      RuleScenario("A Common Cartridge", ({ Given, When, Then, And }) => {
        Given(
          "a folder holding a Common Cartridge {string} whose {string} module has {string} and whose {string} module has {string}",
          (_, name: string, first: string, lecture1: string, second: string, lecture2: string) =>
            holdingExport(
              name,
              cartridge([
                { title: first, things: [{ file: lecture1 }] },
                { title: second, things: [{ file: lecture2 }] },
              ]),
            ),
        );
        When("the lecturer loads it as {string}", load);
        Then("the command shall print {string}", printed);
        And("the course shall hold {string} and {string}", (_, a: string, b: string) => expect(tree(join(parent, "web-development"))).toEqual(expect.arrayContaining([a, b])));
        And("the new course shall check with no errors", async () => {
          const findings = await validate(new NodeFileSystem(join(parent, "web-development")));
          expect(findings.filter((f) => f.severity === "error")).toEqual([]);
        });
      });
    },
  );

  Rule("If a course export in a loaded folder can't be read, then the Studio shall name the file, say why, and create nothing.", ({ RuleScenario }) => {
    RuleScenario("A cartridge that isn't a zip", ({ Given, When, Then, And }) => {
      Given("a folder holding {string} and a damaged export {string}", (_, lecture: string, name: string) => {
        holding(lecture);
        holdingExport(name, new TextEncoder().encode("not a zip"));
      });
      When("the lecturer loads it as {string}", load);
      Then("the command shall print {string}", printed);
      And("no course shall have been made", nothingMade);
    });
  });
});
