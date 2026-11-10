import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { noAssistant } from "../../src/adapters/assistant/none/none-assistant.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "../../src/adapters/telemetry/local/local-telemetry.ts";
import { runHeadless, runPicture } from "../../src/adapters/cli/headless/headless.ts";
import { createAuthoring } from "../../src/application/use-cases/authoring.ts";

const feature = await loadFeature("spec/features/course-details.feature");

describeFeature(feature, ({ Rule }) => {
  let fs: MemoryFileSystem;
  let before: Record<string, string>;
  let lines: string[];
  const authoring = () => createAuthoring({ fs, rules: courseRules, assistant: noAssistant, telemetry: new LocalTelemetry(), newId: () => "plan-1" });

  const course = (_: unknown, title: string, credits: string) => {
    fs = new MemoryFileSystem({
      "course.md": `# ${title}\n\nWelcome.\n`,
      "properties.yaml": `icon:\n  type: fluent-color:book-open-lightbulb-24\ncredits: ${credits}\n`,
      "netlify.toml": '[build]\n  publish = "json"\n',
      "topic-01/topic.md": "---\nicon:\n  type: fluent-color:book-24\n---\n\n# Week 1\n\nThe web.\n",
      "topic-01/topic.png": "PNG",
      "topic-02/topic.md": "---\nicon:\n  type: fluent-color:book-24\n---\n\n# Week 2\n",
      "topic-02/talk-01-css/talk.md": "# CSS\n",
      "topic-02/talk-01-css/talk.pdf": "%PDF",
    });
    before = fs.snapshot();
  };
  const details = async (_: unknown, words: string) => {
    lines = [];
    await runHeadless(authoring(), "details", (line) => lines.push(line), words);
  };
  const choose = async (folder: string, name: string) => {
    lines = [];
    await runPicture(authoring(), folder, { path: name, bytes: new TextEncoder().encode("PICTURE") }, (line) => lines.push(line));
  };
  const printed = (_: unknown, line: string) => expect(lines).toContain(line);
  const has = (_: unknown, path: string) => expect(Object.keys(fs.snapshot())).toContain(path);
  const reads = (_: unknown, path: string, text: string) => expect(fs.snapshot()[path]).toBe(text.replace(/\\n/g, "\n"));
  const unchanged = () => expect(fs.snapshot()).toEqual(before);
  const given = "a two-week course called {string} by {string}";

  Rule(
    "When a lecturer changes the course's title or credits, the Studio shall show a plan that rewrites only the course page's title line and the credits line in properties.yaml.",
    ({ RuleScenario }) => {
      RuleScenario("A new title and credits", ({ Given, When, Then, And }) => {
        Given(given, course);
        When("the lecturer sets the details {string}", details);
        Then("the command shall print {string}", printed);
        And("{string} shall read {string}", reads);
        And("the properties shall read {string}", (_, text: string) => reads(_, "properties.yaml", text));
      });
      RuleScenario("Nothing different", ({ Given, When, Then, And }) => {
        Given(given, course);
        When("the lecturer sets the details {string}", details);
        Then("the command shall print {string}", printed);
        And("the course shall be as it was", unchanged);
      });
    },
  );

  Rule("When a lecturer gives the course a start date, the Studio shall show a plan that writes a calendar dating each week of the course from that day.", ({ RuleScenario }) => {
    RuleScenario("Teaching starts on 25 January", ({ Given, When, Then, And }) => {
      Given(given, course);
      When("the lecturer sets the details {string}", details);
      Then("the calendar shall date week 1 from {string} and week 2 from {string}", (_, first: string, second: string) => {
        const calendar = fs.snapshot()["calendar.yaml"];
        expect(calendar).toContain(`- date: ${first}\n    week: 1`);
        expect(calendar).toContain(`- date: ${second}\n    week: 2`);
        expect(calendar).not.toContain("week: 3");
      });
      And("the details shall say the course starts on {string}", async (_, start: string) => {
        expect((await authoring().courseDetails()).start).toBe(start);
      });
    });
    RuleScenario("Not a date", ({ Given, When, Then }) => {
      Given(given, course);
      When("the lecturer sets the details {string}", details);
      Then("the command shall print {string}", printed);
    });
  });

  Rule(
    "When a lecturer chooses a picture for a card, the Studio shall show a plan that copies it into the item's folder, moves any earlier picture to the bin, and takes out an icon that would show instead.",
    ({ RuleScenario }) => {
      RuleScenario("A picture for week 1", ({ Given, When, Then, And }) => {
        Given(given, course);
        When("the lecturer chooses {string} as the picture for {string}", (_, name: string, folder: string) => choose(folder, name));
        Then("the course shall have {string}", has);
        And("the bin shall hold {string}", (_, name: string) => has(_, `.tutors-bin/${name}`));
        And("{string} shall read {string}", reads);
      });
      RuleScenario("A picture for the course", ({ Given, When, Then, And }) => {
        Given(given, course);
        When("the lecturer chooses {string} as the picture for the course", (_, name: string) => choose("", name));
        Then("the course shall have {string}", has);
        And("{string} shall read {string}", reads);
      });
    },
  );

  Rule("If a lecturer chooses a file that is not a picture for a card, then the Studio shall change nothing and name the kinds of file a card can show.", ({ RuleScenario }) => {
    RuleScenario("A PDF chosen as a picture", ({ Given, When, Then, And }) => {
      Given(given, course);
      When("the lecturer chooses {string} as the picture for {string}", (_, name: string, folder: string) => choose(folder, name));
      Then("the command shall print {string}", printed);
      And("the course shall be as it was", unchanged);
    });
  });

  Rule("The Studio shall name a card's picture by its file name and never draw it.", ({ RuleScenario }) => {
    RuleScenario("What each card shows", ({ Given, Then, And }) => {
      Given(given, course);
      Then("the card for {string} shall show the picture {string}", async (_, folder: string, name: string) => {
        expect(await authoring().cardPicture(folder)).toEqual({ kind: "picture", name });
      });
      And("the card for {string} shall show its icon", async (_, folder: string) => {
        expect(await authoring().cardPicture(folder)).toEqual({ kind: "icon" });
      });
      And("the card for {string} shall show the usual icon", async (_, folder: string) => {
        expect(await authoring().cardPicture(folder)).toEqual({ kind: "usual" });
      });
    });
  });
});
