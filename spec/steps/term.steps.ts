import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { noAssistant } from "../../src/adapters/assistant/none/none-assistant.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "../../src/adapters/telemetry/local/local-telemetry.ts";
import { runHeadless, runRollOver } from "../../src/adapters/cli/headless/headless.ts";
import { createAuthoring } from "../../src/application/use-cases/authoring.ts";
import { startOf } from "../../src/domain/course-details.ts";
import { hiddenIn, releasesIn } from "../../src/domain/term.ts";

const feature = await loadFeature("spec/features/term.feature");

describeFeature(feature, ({ Background, Rule }) => {
  let fs: MemoryFileSystem;
  let today = new Date(2027, 1, 3);
  let lines: string[];
  let before: Record<string, string>;
  let made: MemoryFileSystem;
  const authoring = () => createAuthoring({ fs, rules: courseRules, assistant: noAssistant, telemetry: new LocalTelemetry(), newId: () => "plan-1", now: () => today });
  const run = async (command: string, target = "") => {
    lines = [];
    await runHeadless(authoring(), command, (line) => lines.push(line), target);
  };
  const prints = (_: unknown, line: string) => expect(lines, lines.join("\n")).toContain(line);
  const properties = () => fs.snapshot()["properties.yaml"] ?? "";
  const hiddenWithDate = async (_: unknown, folder: string, date: string) => {
    await run("release", `${folder} ${date}`);
    expect(lines.at(-1)).toMatch(/^Done/);
  };

  Background(({ Given, And }) => {
    Given("a course {string} with four weeks dated from Monday 25 January 2027", (_, title: string) => {
      const files: Record<string, string> = {
        "course.md": `# ${title}\n\nWelcome.\n`,
        "course.png": "PNG",
        "properties.yaml": "credits: A. Lecturer\n",
        "netlify.toml": '[build]\n  publish = "json"\n',
        "json/tutors.json": "{}",
        ".tutors-bin/old-lab/01.old.md": "# Old\n",
      };
      for (let week = 1; week <= 4; week++) {
        files[`topic-0${week}/topic.md`] = `# Week ${week}\n`;
        files[`topic-0${week}/talk-01/talk.md`] = `# Lecture ${week}\n`;
        files[`topic-0${week}/talk-01/talk.pdf`] = "%PDF";
      }
      files["calendar.yaml"] = courseRules.calendar(title, 4, "2027-01-25");
      fs = new MemoryFileSystem(files);
    });
    And("today is 3 February 2027", () => void (today = new Date(2027, 1, 3)));
  });

  Rule("While a course has a calendar, the Studio shall show the current teaching week first on the course home.", ({ RuleScenario }) => {
    RuleScenario("The second week of term", ({ When, Then }) => {
      When("the lecturer asks for the term", () => run("term"));
      Then("the command prints {string}", prints);
    });
    RuleScenario("A course with no calendar", ({ Given, When, Then }) => {
      Given("the course has no calendar", () => fs.remove("calendar.yaml"));
      When("the lecturer asks for the term", () => run("term"));
      Then("the command says to give the course a start date first", () => expect(lines[0]).toMatch(/^This course has no calendar\. Give it a start date/));
    });
  });

  Rule("When a lecturer gives a week a release date, the Studio shall show a plan that hides the week and keeps the date beside it in properties.yaml.", ({ RuleScenario }) => {
    RuleScenario("Week 4 out on the 15th", ({ When, Then, And }) => {
      When("the lecturer gives {string} the release date {string}", (_, folder: string, date: string) => run("release", `${folder} ${date}`));
      Then("the plan hides {string} from students until {string}", (_, title: string, day: string) => expect(lines).toContain(`Plan: Hide "${title}" from students until ${day}.`));
      And("properties.yaml hides {string} and dates it {string}", (_, folder: string, date: string) => {
        expect(hiddenIn(properties())).toContain(folder);
        expect(releasesIn(properties())[folder]).toBe(date);
        expect(properties()).toContain("credits: A. Lecturer");
      });
      And("the command for the term prints {string}", async (_, line: string) => {
        await run("term");
        expect(lines).toContain(line);
      });
    });
  });

  Rule("When a week's release date has arrived and the week is still hidden, the Studio shall offer to publish it and show the change as a plan.", ({ RuleScenario }) => {
    RuleScenario("Week 3 is due today", ({ Given, When, Then, And }) => {
      Given("{string} is hidden with the release date {string}", hiddenWithDate);
      When("the lecturer asks for the term", () => run("term"));
      Then("the command prints {string}", prints);
      When("the lecturer shows the due week {string}", (_, folder: string) => run("show-due", folder));
      Then("the plan shows {string} to students", (_, title: string) => expect(lines).toContain(`Plan: Show "${title}" to students.`));
      And("properties.yaml no longer hides {string}", (_, folder: string) => expect(hiddenIn(properties())).not.toContain(folder));
    });
    RuleScenario("A week not yet due", ({ Given, When, Then }) => {
      Given("{string} is hidden with the release date {string}", hiddenWithDate);
      When("the lecturer shows the due week {string}", (_, folder: string) => run("show-due", folder));
      Then("the command prints {string}", prints);
    });
  });

  Rule(
    "When a lecturer starts next year from a course, the Studio shall make a new course folder with the same content and outcomes, no release dates, and a calendar from the new first Monday, and leave this course as it was.",
    ({ RuleScenario }) => {
      RuleScenario("Web Development 2028", ({ Given, And, When, Then }) => {
        Given("{string} is hidden with the release date {string}", hiddenWithDate);
        And("the course has outcomes", async () => {
          await run("outcomes", "Apply: Students can build a page");
          before = fs.snapshot();
        });
        When("the lecturer starts {string} from it, teaching from Wednesday 12 January 2028", async (_, name: string) => {
          lines = [];
          made = new MemoryFileSystem({});
          const folders: string[] = [];
          const code = await runRollOver(
            () => ({ rules: courseRules, newId: () => "plan-2", makeFolder: async (folder) => (folders.push(folder), made) }),
            fs,
            ["/home/lecturer", "--name", name, "--start", "2028-01-12"],
            (line) => lines.push(line),
          );
          expect(code, lines.join("\n")).toBe(0);
          expect(folders).toEqual(["web-development-2028"]);
        });
        Then("the new folder {string} holds every week, the outcomes and the course's pictures", (_, folder: string) => {
          expect(lines).toContain(`Made ${folder} from this course.`);
          const files = Object.keys(made.snapshot());
          for (let week = 1; week <= 4; week++) expect(files).toContain(`topic-0${week}/talk-01/talk.pdf`);
          expect(files).toContain("outcomes.yaml");
          expect(files).toContain("course.png");
          expect(files.some((file) => file.startsWith("json/") || file.startsWith(".tutors-bin/"))).toBe(false);
        });
        And("its course is called {string}", (_, name: string) => expect(made.snapshot()["course.md"].split("\n")[0]).toBe(`# ${name}`));
        And("its calendar starts on {string}", (_, monday: string) => expect(startOf(made.snapshot()["calendar.yaml"])).toBe(monday));
        And("its properties.yaml has no release dates", () => {
          expect(releasesIn(made.snapshot()["properties.yaml"])).toEqual({});
          expect(made.snapshot()["properties.yaml"]).toContain("credits: A. Lecturer");
        });
        And("this course is as it was", () => expect(fs.snapshot()).toEqual(before));
      });
    },
  );
});
