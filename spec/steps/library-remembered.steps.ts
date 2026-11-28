import { mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { nodeCourseFolder } from "../../src/adapters/fs/node/node-fs.ts";
import { nodeLibrary } from "../../src/adapters/library/node/node-library.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { MemorySettings } from "../../src/adapters/settings/memory/memory-settings.ts";
import { runHeadlessNew } from "../../src/adapters/cli/headless/headless.ts";
import { createLibrary, type LibraryShelf } from "../../src/application/use-cases/library.ts";
import type { LibraryPort } from "../../src/application/ports/library.ts";
import type { Library, RememberedLibrary } from "../../src/domain/library.ts";

const feature = await loadFeature("spec/features/library-remembered.feature");

describeFeature(feature, ({ Background, Rule, AfterEachScenario }) => {
  let root: string;
  let settings: MemorySettings;
  let shelf: LibraryShelf;
  let clock: string;
  /** The library folders Studio looked in, in order. */
  let looked: string[];
  let shown: Library;
  let remembered: RememberedLibrary | null;

  AfterEachScenario(() => rmSync(root, { recursive: true, force: true }));

  const folder = (name: string) => join(root, name);
  /** A library folder holding one course Studio makes. */
  async function holding(name: string) {
    const scratch = mkdtempSync(join(tmpdir(), "studio-remembered-new-"));
    let n = 0;
    await runHeadlessNew(
      (p) => ({ rules: courseRules, newId: () => `plan-${++n}`, makeFolder: nodeCourseFolder(p) }),
      [scratch, "--name", `Course ${name}`, "--weeks", "1"],
      () => {},
    );
    mkdirSync(folder(name), { recursive: true });
    renameSync(join(scratch, readdirSync(scratch)[0]), join(folder(name), "course"));
    rmSync(scratch, { recursive: true, force: true });
  }
  /** The library port, noting each library folder Studio starts looking in: its top, listed first. */
  const counted: LibraryPort = {
    list: (where, dir) => (dir === "" && looked.push(where), nodeLibrary.list(where, dir)),
    read: (where, path) => nodeLibrary.read(where, path),
  };
  const lookedAt = async (_: unknown, at: string) => {
    clock = at;
    for (const name of ["first", "second"]) await shelf.add(folder(name));
    await shelf.search();
    looked = [];
  };
  const opens = async () => {
    remembered = await shelf.remembered();
    shown = remembered!.library;
  };
  const lists = (_: unknown, count: number) => expect(shown.courses).toHaveLength(count);
  const saysLooked = async (_: unknown, at: string) => expect((await shelf.remembered())?.looked).toBe(at);
  const notLooked = () => expect(looked).toEqual([]);

  Background(({ Given }) => {
    Given("library folders {string} and {string}, each holding a new course", async (_, a: string, b: string) => {
      root = mkdtempSync(join(tmpdir(), "studio-remembered-"));
      await holding(a);
      await holding(b);
      settings = new MemorySettings();
      looked = [];
      clock = "2026-11-28T00:00:00.000Z";
      shelf = createLibrary({ library: counted, rules: courseRules, settings, now: () => new Date(clock) });
    });
  });

  Rule(
    "When the lecturer opens the library, the Studio shall show the courses it found when it last looked, without looking again, and say when it last looked.",
    ({ RuleScenario }) => {
      RuleScenario("Back to the library", ({ Given, When, Then, And }) => {
        Given("the Studio looked through the library at {string}", lookedAt);
        When("the lecturer opens the library again", opens);
        Then("it shall list {int} courses", lists);
        And("it shall say it last looked at {string}", saysLooked);
        And("it shall not have looked in any folder again", notLooked);
      });
    },
  );

  Rule("When the lecturer adds a library folder, the Studio shall look only in that folder and keep what it found in the others.", ({ RuleScenario }) => {
    RuleScenario("A third folder", ({ Given, When, Then, And }) => {
      Given("the Studio looked through the library at {string}", lookedAt);
      When("the lecturer adds a library folder {string} holding a new course", async (_, name: string) => {
        await holding(name);
        await shelf.add(folder(name));
        shown = await shelf.searchOne(folder(name));
      });
      Then("it shall have looked only in {string}", (_, name: string) => expect(looked).toEqual([folder(name)]));
      And("it shall list {int} courses", lists);
    });
  });

  Rule("When the lecturer takes a folder out of the library, the Studio shall drop what it found there without looking again.", ({ RuleScenario }) => {
    RuleScenario("Taking a folder out", ({ Given, When, Then, And }) => {
      Given("the Studio looked through the library at {string}", lookedAt);
      When("the lecturer takes {string} out of the library", async (_, name: string) => {
        await shelf.remove(folder(name));
        await opens();
      });
      Then("it shall list {int} course", lists);
      And("it shall not have looked in any folder again", notLooked);
    });
  });

  Rule("When the lecturer asks the Studio to look again, the Studio shall look through every library folder and remember what it finds.", ({ RuleScenario }) => {
    RuleScenario("Look again", ({ Given, When, Then, And }) => {
      Given("the Studio looked through the library at {string}", lookedAt);
      When("the lecturer asks the Studio to look again at {string}", async (_, at: string) => {
        clock = at;
        shown = await shelf.search();
      });
      Then("it shall have looked in {string} and {string}", (_, a: string, b: string) => expect(looked).toEqual([folder(a), folder(b)]));
      And("it shall say it last looked at {string}", saysLooked);
    });
  });
});
