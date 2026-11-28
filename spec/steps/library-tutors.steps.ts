import { mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { nodeCourseFolder } from "../../src/adapters/fs/node/node-fs.ts";
import { nodeLibrary } from "../../src/adapters/library/node/node-library.ts";
import { nodeLibraryTutors } from "../../src/adapters/local-tutors/node/node-library-tutors.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { runHeadlessNew } from "../../src/adapters/cli/headless/headless.ts";
import { searchLibrary } from "../../src/application/use-cases/library.ts";
import { showLibraryInTutors, type LibraryShown } from "../../src/application/use-cases/library-tutors.ts";
import type { LiveTutorsPort } from "../../src/application/ports/live-tutors.ts";
import { libraryShownLine, libraryTutorsLine, type ReaderVisit } from "../../src/domain/library-tutors.ts";

const feature = await loadFeature("spec/features/library-tutors.feature");

const snapshot = (root: string, dir = ""): string[] =>
  readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = dir === "" ? entry.name : `${dir}/${entry.name}`;
    return entry.isDirectory() ? snapshot(root, path) : [`${path}:${readFileSync(join(root, path), "utf8")}`];
  });

/** Tutors on this computer as far as the library needs it: its home page opens at one link. */
const tutors = { home: async () => ({ ok: true as const, link: "http://127.0.0.1:8200/" }) } as unknown as LiveTutorsPort;

describeFeature(feature, ({ Rule, BeforeEachScenario, AfterEachScenario }) => {
  let library: string;
  let scratch: string;
  let cache: string;
  let before: string[];
  let builtIn: string[];
  let failing: string | null;
  let said: string[];
  let shown: LibraryShown;
  let port: ReturnType<typeof nodeLibraryTutors>;

  BeforeEachScenario(() => {
    library = mkdtempSync(join(tmpdir(), "studio-library-"));
    scratch = mkdtempSync(join(tmpdir(), "studio-library-made-"));
    cache = mkdtempSync(join(tmpdir(), "studio-cache-"));
    builtIn = [];
    failing = null;
    said = [];
    // The generator's stand-in: the course's tutors.json in json/, titled from course.md.
    port = nodeLibraryTutors(cache, async (folder) => {
      builtIn.push(folder);
      const title = readFileSync(join(folder, "course.md"), "utf8").split("\n")[0].replace(/^#\s*/, "").trim();
      if (title === failing) return { ok: false, reason: "The Tutors generator stopped before it finished building the course.", detail: "topic-01: no topic.md" };
      mkdirSync(join(folder, "json"), { recursive: true });
      writeFileSync(join(folder, "json", "tutors.json"), JSON.stringify({ title }));
      return { ok: true, folder: "json", generator: "test" };
    });
  });
  AfterEachScenario(async () => {
    await port.stop();
    [library, scratch, cache].forEach((dir) => rmSync(dir, { recursive: true, force: true }));
  });

  const course = async (name: string, at: string) => {
    let n = 0;
    await runHeadlessNew(
      (parent) => ({ rules: courseRules, newId: () => `plan-${++n}`, makeFolder: nodeCourseFolder(parent) }),
      [scratch, "--name", name, "--weeks", "1"],
      () => {},
    );
    const made = readdirSync(scratch)[0];
    mkdirSync(dirname(join(library, at)), { recursive: true });
    renameSync(join(scratch, made), join(library, at));
  };
  const threeCourses = async (_: unknown, a: string, b: string, broken: string) => {
    await course(a, "web-dev");
    await course(b, "2026/mobile");
    await course(broken, "old");
    rmSync(join(library, "old", "unit-1", "topic-01", "topic.md"));
    before = snapshot(library);
  };
  const show = async (stopAfterFirst = false) => {
    const found = await searchLibrary({ library: nodeLibrary, rules: courseRules }, [library]);
    shown = await showLibraryInTutors({ library: port, tutors }, found.courses, {
      progress: (progress) => said.push(libraryTutorsLine(progress)),
      stopped: () => stopAfterFirst && said.length > 0,
    });
  };
  const titles = () => port.home.map((visit) => visit.title);
  const lists = (...wanted: string[]) => expect(titles()).toEqual(expect.arrayContaining(wanted));
  const listsNot = (_: unknown, title: string) => expect(titles()).not.toContain(title);
  const outcome = (_: unknown, line: string) => {
    if (!shown.ok) throw new Error(shown.reason);
    expect(libraryShownLine(shown.shown, shown.unbuilt.length, shown.stopped)).toBe(line);
  };
  const GIVEN = "a library holding ready courses {string} and {string} and a course {string} that needs fixing";

  Rule(
    "When the lecturer asks to show their library in Tutors, the Studio shall build each ready course kept in a library folder on this computer, serve each on this computer only, and list them on the Tutors reader's home page.",
    ({ RuleScenario }) => {
      RuleScenario("Two ready courses and one to fix", ({ Given, When, Then, And }) => {
        Given(GIVEN, threeCourses);
        When("the lecturer shows their library in Tutors", () => show());
        Then("Tutors' home page shall list {string} and {string}, each served on this computer", async (_, a: string, b: string) => {
          lists(a, b);
          for (const visit of port.home) {
            expect(visit.id).toMatch(/^127\.0\.0\.1:83\d\d$/);
            const served = (await (await fetch(`http://${visit.id}/tutors.json`)).json()) as { title: string };
            expect(served.title).toBe(visit.title);
          }
        });
        And("Tutors' home page shall not list {string}", listsNot);
      });
    },
  );

  Rule("The Studio shall build a library course for Tutors from a copy in its own folder, changing nothing in the library folder.", ({ RuleScenario }) => {
    RuleScenario("The build lands in Studio's folder", ({ Given, When, Then, And }) => {
      Given(GIVEN, threeCourses);
      When("the lecturer shows their library in Tutors", () => show());
      Then("each course shall be built in Studio's own folder", () => {
        expect(builtIn).toHaveLength(2);
        for (const folder of builtIn) expect(folder.startsWith(join(cache, "library-builds"))).toBe(true);
      });
      And("the library folder shall be as it was", () => expect(snapshot(library)).toEqual(before));
    });
  });

  Rule("While the Studio builds library courses for Tutors, the Studio shall show which course it is building out of how many, and let the lecturer stop.", ({ RuleScenario }) => {
    RuleScenario("Stopped after the first course", ({ Given, When, Then, And }) => {
      Given(GIVEN, threeCourses);
      When("the lecturer stops showing their library in Tutors once the first course is building", () => show(true));
      Then("Studio shall have said {string}", (_, line: string) => expect(said[0]).toBe(line));
      And("the outcome shall be {string}", outcome);
    });
  });

  Rule("If a library course doesn't build for Tutors, then the Studio shall name it, say why, and still list the other courses in Tutors.", ({ RuleScenario }) => {
    RuleScenario("One course doesn't build", ({ Given, When, Then, And }) => {
      Given(GIVEN, threeCourses);
      And("the generator stops on {string}", (_, title: string) => void (failing = title));
      When("the lecturer shows their library in Tutors", () => show());
      Then("the outcome shall be {string}", outcome);
      And("{string} shall be named with why it didn't build", (_, title: string) => {
        if (!shown.ok) throw new Error(shown.reason);
        expect(shown.unbuilt).toEqual([{ title, reason: "The Tutors generator stopped before it finished building the course.\ntopic-01: no topic.md" }]);
      });
      And("Tutors' home page shall list {string}", (_, title: string) => expect(titles()).toEqual([title]));
    });
  });

  Rule(
    "When the Studio lists the library in Tutors again, the Studio shall take off the reader's home page the library courses it listed before and no longer serves, and leave every other course there as it was.",
    ({ RuleScenario }) => {
      RuleScenario("A course taken out of the library", ({ Given, When, Then, And }) => {
        Given(GIVEN, threeCourses);
        And("Tutors' home page lists a course {string} the lecturer read", (_, title: string) => {
          port.home = [{ id: "reference-course", title, credits: "Tutors", lastVisit: "2026-11-01T09:00:00.000Z", visits: 4 } satisfies ReaderVisit];
        });
        When("the lecturer shows their library in Tutors", () => show());
        And("{string} leaves the library and the lecturer shows their library in Tutors again", async (_, title: string) => {
          expect(titles()).toContain(title);
          rmSync(join(library, "2026"), { recursive: true });
          await show();
        });
        Then("Tutors' home page shall list {string} and {string}", (_, a: string, b: string) => expect(titles()).toEqual([a, b]));
        And("Tutors' home page shall not list {string}", listsNot);
      });
    },
  );
});
