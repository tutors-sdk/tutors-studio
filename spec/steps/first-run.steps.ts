import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { runHeadlessNew } from "../../src/adapters/cli/headless/headless.ts";
import { NodeFileSystem, nodeCourseFolder } from "../../src/adapters/fs/node/node-fs.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { momentFor, type Moment } from "../../src/application/companion/moments.ts";
import { exampleById } from "../../src/domain/example-courses.ts";
import { offersSample } from "../../src/domain/new-course.ts";
import { CompanionVoice } from "../../src/ui/companion-voice.svelte.ts";
import { validate } from "@tutors/course-rules";

const feature = await loadFeature("spec/features/first-run.feature");
const quiet = { errors: 0, emptyWeek: false, needsPermission: false, busy: false, hidden: false };

describeFeature(feature, ({ Rule, AfterEachScenario }) => {
  let courses = 0;
  let parent = "";
  let lines: string[] = [];
  let moment: Moment | null = null;

  AfterEachScenario(() => {
    if (parent) rmSync(parent, { recursive: true, force: true });
    parent = "";
    lines = [];
  });

  Rule("While the lecturer has no courses in Studio's list, the start screen shall offer to try Studio with a sample course.", ({ RuleScenario }) => {
    RuleScenario("A first run", ({ Given, Then }) => {
      Given("Studio's list of courses is empty", () => void (courses = 0));
      Then("the start screen shall offer {string}", () => expect(offersSample(courses)).toBe(true));
    });
    RuleScenario("A lecturer with a course", ({ Given, Then }) => {
      Given("Studio's list holds {int} course", (_, count: number) => void (courses = count));
      Then("the start screen shall not offer the sample course", () => expect(offersSample(courses)).toBe(false));
    });
  });

  Rule(
    "When the lecturer chooses to try the sample course, the Studio shall create a course shaped on Web Development II through an accepted plan, open it, and say that it is a sample whose changes touch none of the lecturer's own courses.",
    ({ RuleScenario }) => {
      RuleScenario("Trying the sample", ({ Given, When, Then, And }) => {
        Given("an empty place for the course", () => void (parent = mkdtempSync(join(tmpdir(), "studio-sample-"))));
        When("the lecturer tries the sample course", async () => {
          let n = 0;
          await runHeadlessNew(
            (at) => ({ rules: courseRules, newId: () => `plan-${++n}`, makeFolder: nodeCourseFolder(at) }),
            [parent, "--sample"],
            (line) => lines.push(line),
          );
        });
        Then("a course called {string} shall be created in the folder {string}", async (_, name: string, folder: string) => {
          expect(lines[0]).toBe(`Created ${folder}.`);
          const tree = await courseRules.buildTree(new NodeFileSystem(join(parent, folder)));
          expect(tree.title).toBe(name);
        });
        And("it shall hold every week of Web Development II", async () => {
          const tree = await courseRules.buildTree(new NodeFileSystem(join(parent, "sample-course")));
          const weeks = tree.children.filter((child) => child.kind === "topic").map((week) => week.title);
          expect(weeks).toEqual(exampleById("web-dev-2")?.weeks.map((week) => week.title));
        });
        And("it shall check with no errors", async () => {
          const findings = await validate(new NodeFileSystem(join(parent, "sample-course")));
          expect(findings.filter((finding) => finding.severity === "error")).toEqual([]);
        });
        And("Studio shall say {string}", (_, words: string) => expect(lines).toContain(words));
      });
    },
  );

  Rule("When the start screen shows with no courses in Studio's list, the companion shall suggest trying the sample course first.", ({ RuleScenario }) => {
    RuleScenario("The first start screen", ({ When, Then }) => {
      When("the start screen shows with no courses", () => void (moment = momentFor("first-run", quiet, new Map(), 0)));
      Then("the companion shall say {string}", (_, words: string) => expect(moment?.text).toBe(words));
    });
  });

  Rule("When the sample course opens, the companion shall say how to try adding material to a week.", ({ RuleScenario }) => {
    RuleScenario("The sample opens", ({ When, Then }) => {
      When("the sample course opens", () => void (moment = momentFor("sample-opened", quiet, new Map(), 0)));
      Then("the companion shall say {string}", (_, words: string) => expect(moment?.text).toBe(words));
    });
  });

  Rule("When the lecturer starts a new course or loads one from the start screen, the companion shall put away its first-run suggestion.", ({ RuleScenario }) => {
    const voice = new CompanionVoice();
    const leaves = () => voice.leftStart();
    RuleScenario("Starting a new course on a first run", ({ Given, When, Then }) => {
      Given("the companion is suggesting the sample course", () => voice.hear("first-run", { ...quiet, hidden: false }));
      When("the lecturer leaves the start screen to start a course", leaves);
      Then("the companion shall say nothing", () => expect(voice.moment).toBeNull());
    });
    RuleScenario("Other help stays", ({ Given, When, Then }) => {
      let said = "";
      Given("the companion is saying {string}", (_, words: string) => {
        voice.hear("course-created", quiet);
        said = words;
      });
      When("the lecturer leaves the start screen to start a course", leaves);
      Then("the companion shall still say it", () => expect(voice.moment?.text).toBe(said));
    });
  });
});
