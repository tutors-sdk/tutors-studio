import { appendFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { nodeCourseFolder } from "../../src/adapters/fs/node/node-fs.ts";
import { nodeLibrary } from "../../src/adapters/library/node/node-library.ts";
import { nodeRegistry } from "../../src/adapters/registry/node/node-registry.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { runCompose, runHeadlessNew, runLibrary, runShare } from "../../src/adapters/cli/headless/headless.ts";

const feature = await loadFeature("spec/features/registry.feature");

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
  let n = 0;
  const deps = () => ({ library: nodeLibrary, registry: nodeRegistry, rules: courseRules, newId: () => `plan-${++n}`, today: () => "2026-11-25" });
  const registry = () => join(library, "shared");

  AfterEachScenario(() => [library, parent].forEach((dir) => rmSync(dir, { recursive: true, force: true })));

  const shareAs = async (course: string, publisher: string, licence: string, more: string[] = []) => {
    lines = [];
    await runShare(deps(), [library, "--course", course, "--to", registry(), "--publisher", publisher, "--licence", licence, ...more], (line) => lines.push(line));
  };
  const shares = (_: unknown, course: string, publisher: string, licence: string) => {
    before = snapshot(join(library, course));
    return shareAs(course, publisher, licence);
  };
  const sharedItem = (_: unknown, item: string, course: string, publisher: string, licence: string) => shareAs(course, publisher, licence, ["--item", item]);
  const composes = async (_: unknown, name: string, pick: string) => {
    lines = [];
    await runCompose({ ...deps(), makeFolder: nodeCourseFolder }, [parent, "--name", name, "--from", library, "--pick", pick], (line) => lines.push(line));
  };
  const printed = (_: unknown, line: string) => expect(lines, lines.join("\n")).toContain(line);
  const stored = () => readdirSync(join(registry(), "items"));

  Background(({ Given }) => {
    Given("a library folder holding a new course {string} at {string} and an empty folder {string}", async (_, name: string, at: string, empty: string) => {
      library = mkdtempSync(join(tmpdir(), "studio-registry-library-"));
      parent = mkdtempSync(join(tmpdir(), "studio-registry-made-"));
      lines = [];
      const scratch = mkdtempSync(join(tmpdir(), "studio-registry-new-"));
      await runHeadlessNew(
        (p) => ({ rules: courseRules, newId: () => `plan-${++n}`, makeFolder: nodeCourseFolder(p) }),
        [scratch, "--name", name, "--weeks", "2"],
        () => {},
      );
      renameSync(join(scratch, readdirSync(scratch)[0]), join(library, at));
      rmSync(scratch, { recursive: true, force: true });
      mkdirSync(join(library, empty));
    });
  });

  Rule(
    "When a lecturer shares a ready course, or one of its items, into a folder registry, the Studio shall show one plan that copies it into the registry as the next version of its entry, and write nothing until they accept it.",
    ({ RuleScenario }) => {
      RuleScenario("Sharing a whole course", ({ When, Then, And }) => {
        When("the lecturer shares {string} as {string} under {string}", shares);
        Then("the command shall print {string}", printed);
        And("the command shall print {string}", printed);
        And("the course folder shall be as it was", () => expect(snapshot(join(library, "web-dev"))).toEqual(before));
      });
      RuleScenario("Sharing again after a change makes the next version", ({ Given, And, When, Then }) => {
        Given("the lecturer shared {string} as {string} under {string}", shares);
        And("the course at {string} has a changed {string}", (_, at: string, path: string) => appendFileSync(join(library, at, path), "\nMore to read.\n"));
        When("the lecturer shares {string} as {string} under {string}", shares);
        Then("the command shall print {string}", printed);
      });
    },
  );

  Rule("If a lecturer shares without a licence, then the Studio shall share nothing and ask for one.", ({ RuleScenario }) => {
    RuleScenario("No licence", ({ When, Then, And }) => {
      When("the lecturer shares {string} as {string} under {string}", shares);
      Then("the command shall print {string}", printed);
      And("the registry folder shall be empty", () => expect(readdirSync(registry())).toEqual([]));
    });
  });

  Rule("The Studio shall store each shared folder in a registry once, under the SHA-256 digest of its files.", ({ RuleScenario }) => {
    RuleScenario("The same files under a second name", ({ Given, When, Then, And }) => {
      Given("the lecturer shared {string} as {string} under {string}", shares);
      When("the lecturer shares {string} as {string} under {string} named {string}", (_, course: string, publisher: string, licence: string, name: string) =>
        shareAs(course, publisher, licence, ["--name", name]),
      );
      Then("the command shall print {string}", printed);
      And("the registry shall hold {int} stored folders", (_, count: number) => expect(stored()).toHaveLength(count));
    });
  });

  Rule(
    "The Studio shall leave out of every share the files a course keeps to itself: hidden files, Tutors' build output, the term's dates, student lists and hosting settings.",
    ({ RuleScenario }) => {
      RuleScenario("The term's dates, the student list and the hosting settings stay behind", ({ Given, When, Then, And }) => {
        Given("the course at {string} also holds {string}, {string} and {string}", (_: unknown, at: string, ...names: string[]) => {
          const kept: Record<string, string> = { "calendar.yaml": "title: Autumn\nweeks: []\n", "enrollment.yaml": "students: []\n" };
          for (const name of names) writeFileSync(join(library, at, name), kept[name] ?? "SECRET=kept to itself\n");
        });
        When("the lecturer shares {string} as {string} under {string}", shares);
        Then("the command shall print {string}", printed);
        And("no stored folder shall hold {string}, {string}, {string} or {string}", (_: unknown, ...names: string[]) => {
          const files = stored().flatMap((folder) => snapshot(join(registry(), "items", folder)).map((line) => line.slice(0, line.indexOf(":")).split("/").pop()));
          for (const name of names) expect(files).not.toContain(name);
        });
      });
    },
  );

  Rule(
    "When a library folder holds a folder registry, the Studio shall list each of its entries at its latest version, with its licence, ready to pick from.",
    ({ RuleScenario }) => {
      RuleScenario("A registry in the library", ({ Given, When, Then }) => {
        Given("the lecturer shared {string} as {string} under {string}", shares);
        When("the lecturer lists the library", async () => {
          lines = [];
          await runLibrary(deps(), [library], (line) => lines.push(line));
        });
        Then("the command shall print {string}", printed);
      });
    },
  );

  Rule(
    "If the files of something picked from a registry no longer match the digest they were shared under, then the Studio shall copy nothing and say it has changed since it was shared.",
    ({ RuleScenario }) => {
      RuleScenario("A stored lab was changed by hand", ({ Given, And, When, Then }) => {
        Given("the lecturer shared the item {string} of {string} as {string} under {string}", sharedItem);
        And("someone changed a file stored for it", () => {
          const [folder] = stored();
          const [file] = readdirSync(join(registry(), "items", folder));
          appendFileSync(join(registry(), "items", folder, file), "changed\n");
        });
        When("the lecturer composes {string} from {string}", composes);
        Then("the command shall print {string}", printed);
        And("no course shall have been made", () => expect(readdirSync(parent)).toEqual([]));
      });
    },
  );

  Rule("If a lecturer shares from a course that needs fixing, then the Studio shall share nothing and say the course needs fixing first.", ({ RuleScenario }) => {
    RuleScenario("A course with a problem", ({ Given, When, Then, And }) => {
      Given("the course at {string} has lost {string}", (_, at: string, path: string) => rmSync(join(library, at, path)));
      When("the lecturer shares {string} as {string} under {string}", shares);
      Then("the command shall print {string}", printed);
      And("the registry folder shall be empty", () => expect(readdirSync(registry())).toEqual([]));
    });
  });

  Rule("The Studio shall name, on the Borrowed material page, the registry entry, version and licence of every item copied from a registry.", ({ RuleScenario }) => {
    RuleScenario("Borrowing a shared lab", ({ Given, When, Then }) => {
      Given("the lecturer shared the item {string} of {string} as {string} under {string}", sharedItem);
      When("the lecturer composes {string} from {string}", composes);
      Then("the Borrowed material page shall list {string}", (_, row: string) => {
        const side = join(parent, "mixed", "side");
        const page = readdirSync(side).find((name) => name.endsWith("-borrowed"));
        expect(readFileSync(join(side, page ?? "", "note.md"), "utf8")).toContain(row);
      });
    });
  });
});
