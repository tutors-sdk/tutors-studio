import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { noAssistant } from "../../src/adapters/assistant/none/none-assistant.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "../../src/adapters/telemetry/local/local-telemetry.ts";
import { runHeadless } from "../../src/adapters/cli/headless/headless.ts";
import { createAuthoring } from "../../src/application/use-cases/authoring.ts";
import { dropAction, stepAction, type ArrangeAction } from "../../src/domain/arrange.ts";

const feature = await loadFeature("spec/features/arranging.feature");

describeFeature(feature, ({ Rule }) => {
  let fs: MemoryFileSystem;
  let before: Record<string, string>;
  let lines: string[];
  let authoring: ReturnType<typeof createAuthoring>;

  const withLectures = (_: unknown, first: string, second: string) => {
    fs = new MemoryFileSystem({
      "course.md": "# Web Development\n",
      "properties.yaml": "credits: Leigh\n",
      "netlify.toml": '[build]\n  publish = "json"\n',
      "topic-01/topic.md": "# Week 1\n",
      "topic-02/topic.md": "# Week 2\n",
      [`topic-01/${first}/talk.md`]: "# HTML\n\nTags and elements.\n",
      [`topic-01/${first}/slides.pdf`]: "%PDF",
      [`topic-01/${second}/talk.md`]: "# CSS\n",
      [`topic-01/${second}/slides.pdf`]: "%PDF",
    });
    before = fs.snapshot();
    authoring = createAuthoring({
      fs,
      rules: courseRules,
      assistant: noAssistant,
      telemetry: new LocalTelemetry(),
      newId: () => `plan-${Object.keys(fs.snapshot()).length}-${Math.random()}`,
    });
  };
  const arranges = async (_: unknown, words: string) => {
    lines = [];
    await runHeadless(authoring, "arrange", (line) => lines.push(line), words);
  };
  const printed = (_: unknown, line: string) => expect(lines, lines.join(" / ")).toContain(line);
  const has = (_: unknown, path: string) => expect(Object.keys(fs.snapshot())).toContain(path);
  const reads = (_: unknown, path: string, text: string) => expect(fs.snapshot()[path]).toBe(text.replace(/\\n/g, "\n"));
  const unchanged = () => expect(fs.snapshot()).toEqual(before);
  const given = "a course whose first week has the lectures {string} and {string}";

  Rule(
    "When a lecturer puts the items of one kind in a folder in a new order, the Studio shall show a plan that renumbers their folders in that order before anything moves.",
    ({ RuleScenario }) => {
      RuleScenario("Two lectures swapped", ({ Given, When, Then, And }) => {
        Given(given, withLectures);
        When("the lecturer arranges {string}", arranges);
        Then("the command shall print {string}", printed);
        And("the first week shall hold {string} and {string}", (_, first: string, second: string) => {
          const talks = [
            ...new Set(
              Object.keys(fs.snapshot())
                .filter((path) => path.startsWith("topic-01/talk"))
                .map((path) => path.split("/")[1]),
            ),
          ];
          expect(talks.sort()).toEqual([first, second]);
          expect(fs.snapshot()[`topic-01/${first}/talk.md`]).toBe("# CSS\n");
        });
      });
      RuleScenario("A new order put back", ({ Given, When, And, Then }) => {
        Given(given, withLectures);
        When("the lecturer arranges {string}", arranges);
        And("the lecturer puts back the latest change", async () => {
          lines = [];
          await runHeadless(authoring, "undo", (line) => lines.push(line));
        });
        Then("the command shall print {string}", printed);
        And("the course shall be as it was", unchanged);
      });
    },
  );

  Rule("When a lecturer moves an item to another week, the Studio shall show a plan that moves it there with the next free number of its kind.", ({ RuleScenario }) => {
    RuleScenario("A lecture moved to week 2", ({ Given, When, Then, And }) => {
      Given(given, withLectures);
      When("the lecturer arranges {string}", arranges);
      Then("the command shall print {string}", printed);
      And("the course shall have {string}", has);
    });
  });

  Rule(
    "If a lecturer moves an item where Tutors does not show that kind, then the Studio shall change nothing and give course-rules' sentence for where it can go.",
    ({ RuleScenario }) => {
      RuleScenario("A week dropped into another week", ({ Given, When, Then, And }) => {
        Given(given, withLectures);
        When("the lecturer arranges {string}", arranges);
        Then("the command shall print {string}", printed);
        And("the course shall be as it was", unchanged);
      });
    },
  );

  Rule(
    "When a lecturer gives an item a new title, the Studio shall show a plan that rewrites only the title line of the page its card takes its title from.",
    ({ RuleScenario }) => {
      RuleScenario("A lecture renamed", ({ Given, When, Then, And }) => {
        Given(given, withLectures);
        When("the lecturer arranges {string}", arranges);
        Then("the command shall print {string}", printed);
        And("{string} shall read {string}", reads);
      });
    },
  );

  Rule("When a lecturer hides a week from students, the Studio shall show a plan that adds the week to the course's ignore list in properties.yaml.", ({ RuleScenario }) => {
    RuleScenario("Week 2 hidden", ({ Given, When, Then }) => {
      Given(given, withLectures);
      When("the lecturer arranges {string}", arranges);
      Then("{string} shall read {string}", reads);
    });
  });

  Rule(
    "If a lecturer asks to hide an item inside a week, then the Studio shall change nothing and give course-rules' sentence for how to keep it from students.",
    ({ RuleScenario }) => {
      RuleScenario("Hiding a lecture", ({ Given, When, Then, And }) => {
        Given(given, withLectures);
        When("the lecturer arranges {string}", arranges);
        Then("the command shall print {string}", printed);
        And("the course shall be as it was", unchanged);
      });
    },
  );

  Rule(
    "When a lecturer removes an item, the Studio shall show a plan that moves it into the course's bin, which Tutors never publishes, and deletes nothing.",
    ({ RuleScenario }) => {
      RuleScenario("A lecture removed", ({ Given, When, Then, And }) => {
        Given(given, withLectures);
        When("the lecturer arranges {string}", arranges);
        Then("the command shall print {string}", printed);
        And("the course shall have {string}", has);
        And("checking the course shall find no talk {string}", async (_, name: string) => {
          const tree = await courseRules.buildTree(fs);
          const names = (folder: typeof tree): string[] => [folder.name, ...folder.children.flatMap(names)];
          expect(names(tree)).not.toContain(name);
        });
      });
    },
  );

  let summary: string | null;
  const planAndAccept = async (action: ArrangeAction | null) => {
    summary = null;
    if (action === null) return;
    const planned = await authoring.planArrange(action);
    expect(planned.ok).toBe(true);
    if (!planned.ok) return;
    summary = planned.plan.summary;
    expect((await authoring.apply(planned.plan)).ok).toBe(true);
  };
  const drops = async (_: unknown, dragged: string, target: string) => planAndAccept(dropAction(await courseRules.buildTree(fs), dragged, target));
  const planReads = (_: unknown, text: string) => expect(summary).toBe(text);

  Rule(
    "When a lecturer drops an item on another, the Studio shall plan putting it in that item's place where both are of one kind in one folder, and otherwise moving it into the other.",
    ({ RuleScenario }) => {
      RuleScenario("The second lecture dropped on the first", ({ Given, When, Then, And }) => {
        Given(given, withLectures);
        When("the lecturer drops {string} on {string} and accepts the plan", drops);
        Then("the plan shall read {string}", planReads);
        And("{string} shall read {string}", reads);
      });
      RuleScenario("A lecture dropped on week 2", ({ Given, When, Then, And }) => {
        Given(given, withLectures);
        When("the lecturer drops {string} on {string} and accepts the plan", drops);
        Then("the plan shall read {string}", planReads);
        And("the course shall have {string}", has);
      });
    },
  );

  Rule("When a lecturer moves an item earlier or later from the keyboard, the Studio shall plan swapping it with its neighbour of the same kind.", ({ RuleScenario }) => {
    RuleScenario("The first lecture moved later", ({ Given, When, Then, And }) => {
      Given(given, withLectures);
      When("the lecturer moves {string} later and accepts the plan", async (_, path: string) => planAndAccept(stepAction(await courseRules.buildTree(fs), path, 1)));
      Then("the plan shall read {string}", planReads);
      And("{string} shall read {string}", reads);
    });
    RuleScenario("The last lecture cannot move later", ({ Given, When, Then }) => {
      Given(given, withLectures);
      When("the lecturer moves {string} later", async (_, path: string) => {
        expect(stepAction(await courseRules.buildTree(fs), path, 1)).toBeNull();
        summary = null;
      });
      Then("there shall be no plan", () => expect(summary).toBeNull());
    });
  });
});
