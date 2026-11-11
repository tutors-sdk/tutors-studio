import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect, vi } from "vitest";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { MemorySettings } from "../../src/adapters/settings/memory/memory-settings.ts";
import { noAssistant } from "../../src/adapters/assistant/none/none-assistant.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "../../src/adapters/telemetry/local/local-telemetry.ts";
import { createAuthoring } from "../../src/application/use-cases/authoring.ts";
import { createRecentCourses, type RecentCourses } from "../../src/application/use-cases/recent-courses.ts";
import { flatten, weekFlag, type MapNode } from "../../src/domain/course-map.ts";

const feature = await loadFeature("spec/features/course-home.feature");

/** A topic page as a new course writes it, still holding the starter text. */
const starterTopic = () =>
  courseRules
    .newCourseFiles({ name: "Web Development", lecturer: "Ann Lee", weeks: 2, shape: { lectures: 1, labs: 1, readings: 0 }, project: false })
    .find((file) => file.path.endsWith("topic.md"))!.content;

describeFeature(feature, ({ Rule }) => {
  let recents: RecentCourses;
  let flags: string[];

  const openedTwo = async (_: unknown, first: string, second: string) => {
    recents = createRecentCourses(new MemorySettings());
    await recents.remember(first);
    await recents.remember(second);
  };
  const lists = async (_: unknown, names: string) => expect((await recents.list()).map((course) => course.name).join(", ")).toBe(names);

  Rule("When a lecturer opens or makes a course, the Studio shall put it first among the start screen's courses, each course once and at most eight.", ({ RuleScenario }) => {
    RuleScenario("Opening a course again", ({ Given, When, Then }) => {
      Given("the lecturer has opened {string} and then {string}", openedTwo);
      When("the lecturer opens {string} again", (_, path: string) => recents.remember(path));
      Then("the start screen shall list {string}", lists);
    });
    RuleScenario("Ten courses", ({ Given, Then }) => {
      Given("the lecturer has opened ten courses", async () => {
        recents = createRecentCourses(new MemorySettings());
        for (let n = 1; n <= 10; n++) await recents.remember(`/courses/course-${n}`);
      });
      Then("the start screen shall list 8 courses, the newest first", async () => {
        const listed = await recents.list();
        expect(listed).toHaveLength(8);
        expect(listed[0].name).toBe("course-10");
      });
    });
  });

  Rule("When Studio starts, the Studio shall reopen the course open last, or, if its folder has gone, drop it from the list and say so.", ({ RuleScenario }) => {
    RuleScenario("The last course is reopened", ({ Given, Then }) => {
      Given("the lecturer has opened {string} and then {string}", openedTwo);
      Then("Studio shall reopen {string} when it starts", async (_, path: string) => expect(await recents.last()).toBe(path));
    });
    RuleScenario("A course whose folder has gone", ({ Given, When, Then }) => {
      Given("the lecturer has opened {string} and then {string}", openedTwo);
      When("the folder {string} has gone", (_, path: string) => recents.forget(path));
      Then("the start screen shall list {string}", lists);
    });
  });

  Rule("The Studio shall show each week on the course home as needing sorting out, empty so far, still to write, or written.", ({ RuleScenario }) => {
    RuleScenario("Four weeks in four states", ({ Given, When, Then }) => {
      let fs: MemoryFileSystem;
      Given("a course whose week 1 is written, week 2 still holds starter text, week 3 is empty and week 4 has a talk with no slides", () => {
        fs = new MemoryFileSystem({
          "course.md": "# Web Development\n",
          "netlify.toml": '[build]\n  publish = "json"\n',
          "topic-01/topic.md": "# Week 1\n\nThe web, and how a page reaches a browser.\n",
          "topic-01/talk-01/talk.md": "# The web\n",
          "topic-01/talk-01/talk.pdf": "%PDF",
          "topic-02/topic.md": starterTopic(),
          "topic-02/talk-01/talk.md": "# Layout\n",
          "topic-02/talk-01/talk.pdf": "%PDF",
          "topic-03/topic.md": "# Week 3\n\nForms.\n",
          "topic-04/topic.md": "# Week 4\n\nScripts.\n",
          "topic-04/talk-01/talk.md": "# Scripts\n",
        });
      });
      When("the lecturer opens the course home", async () => {
        const authoring = createAuthoring({ fs, rules: courseRules, assistant: noAssistant, telemetry: new LocalTelemetry(), newId: () => "plan-1" });
        const [view, states] = await Promise.all([authoring.refresh(), authoring.weekStates()]);
        const needsFixing = (item: MapNode): boolean => item.status === "error" || item.children.some(needsFixing);
        flags = flatten(view.map)
          .filter((node) => node.kind === "topic")
          .map((week) => weekFlag(week, states[week.path], needsFixing(week)) ?? "");
      });
      Then("the weeks shall show as {string}", (_, list: string) => expect(flags.join(", ")).toBe(list));
    });
  });

  Rule(
    "When files in the open course change on disk, in Studio or another app, the Studio shall read the course again and show the change on the course map.",
    ({ RuleScenario }) => {
      RuleScenario("Slides saved from another app", ({ Given, When, Then, And }) => {
        let fs: MemoryFileSystem;
        let readings = 0;
        let errors = -1;
        Given("a course whose week 1 has a talk with no slides", () => {
          fs = new MemoryFileSystem({
            "course.md": "# Web Development\n",
            "netlify.toml": '[build]\n  publish = "json"\n',
            "topic-01/topic.md": "# Week 1\n",
            "topic-01/talk-01/talk.md": "# The web\n",
          });
        });
        And("the lecturer is watching the course map", () => {
          const authoring = createAuthoring({ fs, rules: courseRules, assistant: noAssistant, telemetry: new LocalTelemetry(), newId: () => "plan-1" });
          authoring.watch(() => {
            readings++;
            void authoring.refresh().then((view) => (errors = view.findings.filter((finding) => finding.severity === "error").length));
          });
        });
        When("another app saves {string}", async (_, path: string) => {
          vi.useFakeTimers();
          await fs.write(path, new TextEncoder().encode("%PDF"));
          await fs.write(path, new TextEncoder().encode("%PDF-1.7"));
          vi.advanceTimersByTime(400);
          vi.useRealTimers();
        });
        Then("the course map shall be read again once", () => expect(readings).toBe(1));
        And("the course shall have no errors", async () => {
          await vi.waitFor(() => expect(errors).toBe(0));
        });
      });
    },
  );

  const openedThree = async (_: unknown, first: string, second: string, third: string) => {
    recents = createRecentCourses(new MemorySettings());
    for (const path of [first, second, third]) await recents.remember(path);
  };

  Rule("When a lecturer forgets a course on the start screen, the Studio shall take it off the list and leave its folder and files as they are.", ({ RuleScenario }) => {
    RuleScenario("Forgetting a course", ({ Given, And, When, Then }) => {
      const course = {
        "course.md": "# Agile\n",
        "topic-01/topic.md": "# Week 1\n",
        "topic-01/talk-01/talk.pdf": "%PDF",
      };
      let fs: MemoryFileSystem;
      Given("the lecturer has opened {string}, {string} and then {string}", openedThree);
      And("the folder {string} holds a course", () => {
        fs = new MemoryFileSystem(course);
      });
      When("the lecturer forgets {string}", (_, path: string) => recents.forget(path));
      Then("the start screen shall list {string}", lists);
      And("the folder {string} shall still hold every file it had", async () => {
        for (const [path, content] of Object.entries(course)) expect(new TextDecoder().decode(await fs.read(path))).toBe(content);
      });
    });
  });

  Rule("When a lecturer puts back a course they have just forgotten, the Studio shall list it where it was.", ({ RuleScenario }) => {
    RuleScenario("Putting a forgotten course back", ({ Given, When, And, Then }) => {
      let forgotten: { path: string; at: number };
      Given("the lecturer has opened {string}, {string} and then {string}", openedThree);
      When("the lecturer forgets {string}", async (_, path: string) => {
        forgotten = { path, at: (await recents.list()).findIndex((course) => course.path === path) };
        await recents.forget(path);
      });
      And("the lecturer puts it back", () => recents.restore(forgotten.path, forgotten.at));
      Then("the start screen shall list {string}", lists);
    });
  });
});
