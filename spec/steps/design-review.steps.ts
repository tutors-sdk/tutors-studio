import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { noAssistant } from "../../src/adapters/assistant/none/none-assistant.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "../../src/adapters/telemetry/local/local-telemetry.ts";
import { createAuthoring } from "../../src/application/use-cases/authoring.ts";
import { courseStanding, type WeekState } from "../../src/domain/course-map.ts";
import { leavingAsks, UNSAVED_WORDS } from "../../src/domain/plain-writing.ts";
import { quizPlace } from "../../src/domain/quiz.ts";
import { CompanionVoice } from "../../src/ui/companion-voice.svelte.ts";

const feature = await loadFeature("spec/features/design-review.feature");
const quiet = { errors: 0, emptyWeek: false, needsPermission: false, busy: false, hidden: false };

describeFeature(feature, ({ Rule }) => {
  Rule(
    "While a course has no errors, the Studio shall say under its title how many weeks are still to write, and lead with Check and publish only once a week is written and no other screen's next action is showing.",
    ({ RuleScenario }) => {
      let standing = courseStanding(0, {});
      const course = (_: unknown, errors: number, weeks: number, written: number) => {
        const states: Record<string, WeekState> = {};
        for (let week = 1; week <= weeks; week++) states[`topic-${week}`] = week <= written ? "written" : "not-written";
        standing = courseStanding(errors, states);
      };
      const says = (_: unknown, line: string) => expect(standing.line).toBe(line);
      RuleScenario("A new course with nothing written", ({ Given, Then, And }) => {
        Given("a course with no errors and {int} weeks, none written", (_, weeks: number) => course(_, 0, weeks, 0));
        Then("the line under its title says {string}", says);
        And("Check and publish does not lead", () => expect(standing.publishNext).toBe(false));
      });
      RuleScenario("A course with a week written", ({ Given, Then, And }) => {
        Given("a course with no errors and {int} weeks, {int} written", (_, weeks: number, written: number) => course(_, 0, weeks, written));
        Then("the line under its title says {string}", says);
        And("Check and publish leads", () => expect(standing.publishNext).toBe(true));
      });
      RuleScenario("A course with errors", ({ Given, Then, And }) => {
        Given("a course with {int} errors and {int} weeks, {int} written", course);
        Then("the line under its title says {string}", says);
        And("Check and publish does not lead", () => expect(standing.publishNext).toBe(false));
      });
    },
  );

  Rule(
    "When the lecturer closes an editor with words not yet saved, the Studio shall ask whether to save them first, close without saving, or keep writing.",
    ({ RuleScenario }) => {
      let unsaved = false;
      let asks = false;
      RuleScenario("Closing with unsaved words", ({ Given, When, Then }) => {
        Given("the lecturer has changed a page and not saved it", () => void (unsaved = true));
        When("the lecturer closes the editor", () => void (asks = leavingAsks(unsaved)));
        Then("Studio asks {string}", (_, words: string) => {
          expect(asks).toBe(true);
          expect(UNSAVED_WORDS).toBe(words);
        });
      });
      RuleScenario("Closing with everything saved", ({ Given, When, Then }) => {
        Given("the lecturer has saved every change to a page", () => void (unsaved = false));
        When("the lecturer closes the editor", () => void (asks = leavingAsks(unsaved)));
        Then("the editor closes without asking", () => expect(asks).toBe(false));
      });
    },
  );

  Rule("When the lecturer adds a quiz to a week, the quiz designer shall name the week by the title students see, never by its folder.", ({ RuleScenario }) => {
    RuleScenario("A new quiz in week 2", ({ Given, When, Then }) => {
      let week = { kind: "topic" as string | null, title: null as string | null, name: "" };
      let place = "";
      Given("the week {string} titled {string}", (_, name: string, title: string) => void (week = { kind: "topic", title, name }));
      When("the lecturer adds a quiz to it", () => void (place = quizPlace(week)));
      Then("the quiz designer says the quiz is in {string}", (_, title: string) => {
        expect(place).toBe(title);
        expect(place).not.toContain(week.name);
      });
    });
  });

  Rule("While a week is hidden from students, its page shall say so and offer only to show it again.", ({ RuleScenario }) => {
    RuleScenario("A hidden week", ({ Given, Then, And }) => {
      let hidden: string[] = [];
      Given("a course whose properties.yaml hides {string}", async (_, folder: string) => {
        const fs = new MemoryFileSystem({
          "course.md": "# Course\n",
          "properties.yaml": `credits: A. Lecturer\nignore:\n  - ${folder}\n`,
          "topic-01/topic.md": "# Week 1\n",
          "topic-02/topic.md": "# Week 2\n",
        });
        const authoring = createAuthoring({ fs, rules: courseRules, assistant: noAssistant, telemetry: new LocalTelemetry(), newId: () => "plan-1" });
        hidden = await authoring.hiddenFromStudents();
      });
      Then("Studio reads {string} as hidden from students", (_, folder: string) => expect(hidden).toContain(folder));
      And("Studio reads {string} as seen by students", (_, folder: string) => expect(hidden).not.toContain(folder));
    });
  });

  Rule("When the lecturer opens Settings, an editor, the quiz designer, Check and publish or Changes, the companion shall put away what it was saying.", ({ RuleScenario }) => {
    RuleScenario("Opening an editor while the helper speaks", ({ Given, When, Then }) => {
      const voice = new CompanionVoice();
      Given("the companion is saying {string}", (_, words: string) => {
        voice.hear("course-created", quiet);
        expect(voice.moment?.text).toBe(words);
      });
      When("the lecturer opens another screen", () => voice.screenOpened());
      Then("the companion says nothing", () => expect(voice.moment).toBeNull());
    });
  });
});
