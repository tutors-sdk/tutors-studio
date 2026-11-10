import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { noAssistant } from "../../src/adapters/assistant/none/none-assistant.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "../../src/adapters/telemetry/local/local-telemetry.ts";
import { runHeadless } from "../../src/adapters/cli/headless/headless.ts";
import { createAuthoring } from "../../src/application/use-cases/authoring.ts";
import { dropAction, stepAction, weekFor, type ArrangeAction, type DropPlace } from "../../src/domain/arrange.ts";

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
  const dropsAt = (place: DropPlace) => async (_: unknown, dragged: string, target: string) => planAndAccept(dropAction(await courseRules.buildTree(fs), dragged, target, place));
  const hasNo = (_: unknown, path: string) => expect(Object.keys(fs.snapshot())).not.toContain(path);
  let added: string[] = [];
  const dropsFiles = async (_: unknown, file: string, row: string) => {
    const week = weekFor(await courseRules.buildTree(fs), row);
    expect(week).not.toBeNull();
    const planned = await authoring.planMaterial(week!, [{ path: file, bytes: new TextEncoder().encode("%PDF-1.4\n") }]);
    added = planned.plan === null ? [] : planned.plan.ops.map((op) => (op.op === "write" ? op.path : op.to));
  };
  const planReads = (_: unknown, text: string) => expect(summary).toBe(text);

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

  Rule(
    "When a lecturer drops an item just above or just below another of its kind in the same folder, the Studio shall plan putting it there, in that order.",
    ({ RuleScenario }) => {
      RuleScenario("Week 2 dropped above week 1", ({ Given, When, Then, And }) => {
        Given(given, withLectures);
        When("the lecturer drops {string} before {string} and accepts the plan", dropsAt("before"));
        Then("the plan shall read {string}", planReads);
        And("{string} shall read {string}", reads);
      });
      RuleScenario("The first lecture dropped below the second", ({ Given, When, Then, And }) => {
        Given(given, withLectures);
        When("the lecturer drops {string} after {string} and accepts the plan", dropsAt("after"));
        Then("the plan shall read {string}", planReads);
        And("{string} shall read {string}", reads);
      });
    },
  );

  Rule(
    "When a lecturer drops an item on a folder, the Studio shall plan moving it inside only where Tutors shows that kind there, and otherwise placing it beside that folder.",
    ({ RuleScenario }) => {
      RuleScenario("A lecture dropped on week 2", ({ Given, When, Then, And }) => {
        Given(given, withLectures);
        When("the lecturer drops {string} into {string} and accepts the plan", dropsAt("into"));
        Then("the plan shall read {string}", planReads);
        And("the course shall have {string}", has);
      });
      RuleScenario("Week 2 dropped on week 1 goes beside it, not inside", ({ Given, When, Then, And }) => {
        Given(given, withLectures);
        When("the lecturer drops {string} into {string} and accepts the plan", dropsAt("into"));
        Then("the plan shall read {string}", planReads);
        And("the course shall have {string}", has);
        And("the course shall have no {string}", hasNo);
      });
      RuleScenario("Week 2 dropped on a lecture in week 1 goes beside week 1", ({ Given, When, Then, And }) => {
        Given(given, withLectures);
        When("the lecturer drops {string} into {string} and accepts the plan", dropsAt("into"));
        Then("the plan shall read {string}", planReads);
        And("the course shall have no {string}", hasNo);
      });
    },
  );

  Rule(
    "When a lecturer drops files from their computer on a week in the contents or anywhere on a week's page, the Studio shall propose the plan for adding them to that week.",
    ({ RuleScenario }) => {
      RuleScenario("Slides dropped on week 2 in the contents", ({ Given, When, Then }) => {
        Given(given, withLectures);
        When("the lecturer drops {string} from their computer on {string}", dropsFiles);
        Then("the plan shall add {string}", (_, path: string) => expect(added).toContain(path));
      });
      RuleScenario("Slides dropped on a lecture's row go to its week", ({ Given, When, Then }) => {
        Given(given, withLectures);
        When("the lecturer drops {string} from their computer on {string}", dropsFiles);
        Then("the plan shall add {string}", (_, path: string) => expect(added).toContain(path));
      });
    },
  );
});
