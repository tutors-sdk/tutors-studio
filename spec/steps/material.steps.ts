import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { noAssistant } from "../../src/adapters/assistant/none/none-assistant.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "../../src/adapters/telemetry/local/local-telemetry.ts";
import { createAuthoring } from "../../src/application/use-cases/authoring.ts";
import type { AuthoringPort, CourseView, MaterialPlan } from "../../src/application/ports/authoring.ts";
import { flatten } from "../../src/domain/course-map.ts";
import type { DroppedFile } from "../../src/domain/material.ts";

const feature = await loadFeature("spec/features/material.feature");
const bytes = (text: string) => new TextEncoder().encode(text);

/** What a dropped file holds: a link file its address, a step its heading, anything else a few bytes. */
const dropped = (path: string): DroppedFile => {
  if (path.endsWith(".url")) return { path, bytes: bytes("[InternetShortcut]\nURL=https://docs.python.org/3/\n") };
  if (path.endsWith(".md")) return { path, bytes: bytes(`# ${path.slice(path.lastIndexOf("/") + 4, -3)}\n\nDo this.\n`) };
  return { path, bytes: bytes(path.endsWith(".pdf") ? "%PDF-1.7" : "PK") };
};

describeFeature(feature, ({ Rule }) => {
  let fs: MemoryFileSystem;
  let authoring: AuthoringPort;
  let view: CourseView;
  let proposal: MaterialPlan;
  let before: Record<string, string>;

  const course = (files: Record<string, string>) => {
    fs = new MemoryFileSystem({ "course.md": "# Web Development\n", "netlify.toml": '[build]\n  publish = "json"\n', ...files });
    before = fs.snapshot();
    authoring = createAuthoring({ fs, rules: courseRules, assistant: noAssistant, telemetry: new LocalTelemetry(), newId: () => "plan-1" });
  };
  const twoWeeks = () => course({ "topic-01/topic.md": "# Week 1\n", "topic-02/topic.md": "# Week 2\n" });
  const drop = async (folder: string, paths: string[]) => {
    proposal = await authoring.planMaterial(folder, paths.map(dropped));
  };
  const adds = (_: unknown, label: string, title: string, folder: string) => expect(proposal.placed).toContainEqual({ label, title, folder });
  const traySays = (_: unknown, path: string, reason: string) => expect(proposal.tray.find((file) => file.path === path)?.message).toContain(reason);

  Rule("The Studio shall show each folder on the course map by the title its card shows, and by its folder name when it has none.", ({ RuleScenario }) => {
    RuleScenario("A topic titled Week 1 and a talk with no title", ({ Given, When, Then, And }) => {
      Given('a course whose topic-01 is titled "Week 1" and whose talk has an empty talk.md', () =>
        course({ "topic-01/topic.md": "# Week 1\n", "topic-01/talk-01/talk.md": "", "topic-01/talk-01/slides.pdf": "%PDF" }),
      );
      When("the lecturer opens the course", async () => {
        view = await authoring.refresh();
      });
      const shows = (_: unknown, path: string, text: string) => {
        const node = flatten(view.map).find((n) => n.path === path)!;
        expect(node.title ?? node.name).toBe(text);
      };
      Then("{string} shall show as {string}", shows);
      And("{string} shall show as {string}", shows);
    });
  });

  Rule(
    "When a lecturer drops files on a topic, the Studio shall propose a plan that puts each file it recognises in its own learning object of the kind Tutors shows it as.",
    ({ RuleScenario }) => {
      RuleScenario("Slides, a reading, a lab and a link dropped on Week 1", ({ Given, When, Then, And }) => {
        Given('a course whose topic-01 is titled "Week 1" and already holds talk-01', () =>
          course({ "topic-01/topic.md": "# Week 1\n", "topic-01/talk-01/talk.md": "# Welcome\n", "topic-01/talk-01/slides.pdf": "%PDF" }),
        );
        When("the lecturer drops {string}, {string}, {string}, {string} and {string} on {string}", (_, a: string, b: string, c: string, d: string, e: string, folder: string) =>
          drop(folder, [a, b, c, d, e]),
        );
        Then("the plan shall add a Talk {string} as {string}", (_, title: string, folder: string) => adds(_, "Talk", title, folder));
        And("the plan shall add a Note {string} as {string}", (_, title: string, folder: string) => adds(_, "Note", title, folder));
        And("the plan shall add a Lab {string} as {string} with steps {string} and {string}", (_, title: string, folder: string, first: string, second: string) => {
          adds(_, "Lab", title, folder);
          const written = proposal.plan!.ops.map((op) => (op.op === "write" ? op.path : op.to));
          expect(written).toEqual(expect.arrayContaining([`${folder}/${first}`, `${folder}/${second}`]));
        });
        And("the plan shall add a Web link {string} as {string}", (_, title: string, folder: string) => adds(_, "Web link", title, folder));
        And("nothing shall have been written to the course", () => expect(fs.snapshot()).toEqual(before));
        When("the lecturer accepts the plan", async () => {
          expect(await authoring.apply(proposal.plan!)).toEqual({ ok: true });
        });
        Then("the course shall have no errors", async () => {
          expect((await authoring.refresh()).findings.filter((f) => f.severity === "error")).toEqual([]);
        });
      });
    },
  );

  Rule("When a lecturer drops a folder of material on the course, the Studio shall propose placing each item in the topic for the week its name gives.", ({ RuleScenario }) => {
    RuleScenario("A folder of weekly slides", ({ Given, When, Then, And }) => {
      Given("a course with topics for weeks 1 and 2", twoWeeks);
      When("the lecturer drops {string} and {string} on the course", (_, a: string, b: string) => drop("", [a, b]));
      Then("the plan shall add a Talk {string} as {string}", (_, title: string, folder: string) => adds(_, "Talk", title, folder));
      And("the plan shall add a Talk {string} as {string}", (_, title: string, folder: string) => adds(_, "Talk", title, folder));
    });
  });

  Rule(
    "If nothing in a dropped file's name says which week it is for, or the course has no topic for that week, then the Studio shall leave it in the tray with the reason and place nothing for it.",
    ({ RuleScenario }) => {
      RuleScenario("A file with no week and a week with no topic", ({ Given, When, Then, And }) => {
        Given("a course with topics for weeks 1 and 2", twoWeeks);
        When("the lecturer drops {string} and {string} on the course", (_, a: string, b: string) => drop("", [a, b]));
        Then("the tray shall hold {string} because {string}", traySays);
        And("the tray shall also hold {string} because {string}", traySays);
        And("there shall be no plan", () => expect(proposal.plan).toBeNull());
      });
    },
  );

  Rule(
    "When a lecturer drops a file of a kind Tutors doesn't show, the Studio shall keep it, unopened, in the working-files folder where it was dropped, which the course map then flags in the rules' own words.",
    ({ RuleScenario }) => {
      RuleScenario("A spreadsheet and slides dropped on Week 1", ({ Given, When, Then, And }) => {
        Given("a course with topics for weeks 1 and 2", twoWeeks);
        When("the lecturer drops {string} and {string} on {string}", (_, a: string, b: string, folder: string) => drop(folder, [a, b]));
        Then("the plan shall add a Talk {string} as {string}", (_, title: string, folder: string) => adds(_, "Talk", title, folder));
        And("the plan shall add a Working file {string} as {string}", (_, title: string, folder: string) => adds(_, "Working file", title, folder));
        And("the tray shall be empty", () => expect(proposal.tray).toEqual([]));
        When("the lecturer accepts the plan", async () => {
          expect(await authoring.apply(proposal.plan!)).toEqual({ ok: true });
        });
        Then("{string} shall hold what was dropped", (_, path: string) => expect(fs.snapshot()[path]).toBe("PK"));
        And("the course map shall flag {string} with {string}", async (_, path: string, words: string) => {
          const node = flatten((await authoring.refresh()).map).find((n) => n.path === path)!;
          expect(node.findings.map((finding) => finding.message).join(" ")).toContain(words);
        });
      });
      RuleScenario("A second file with the same name", ({ Given, When, Then }) => {
        Given('a course with topics for weeks 1 and 2 and a working file "topic-01/files/marks.csv"', () =>
          course({ "topic-01/topic.md": "# Week 1\n", "topic-02/topic.md": "# Week 2\n", "topic-01/files/marks.csv": "a,b\n" }),
        );
        When("the lecturer drops {string} on {string}", (_, a: string, folder: string) => drop(folder, [a]));
        Then("the plan shall add a Working file {string} as {string}", (_, title: string, folder: string) => adds(_, "Working file", title, folder));
      });
    },
  );

  Rule("When a lecturer drops files on a week, the Studio shall add each file it can place straight away and offer to put the whole drop back.", ({ RuleScenario }) => {
    RuleScenario("Slides dropped on Week 1 go straight in, and back out", ({ Given, When, Then, And }) => {
      const has = (_: unknown, path: string) => expect(Object.keys(fs.snapshot())).toContain(path);
      const hasNo = (_: unknown, path: string) => expect(Object.keys(fs.snapshot())).not.toContain(path);
      Given("a course with two weeks", twoWeeks);
      // The week's drop zone applies the plan as soon as it is made (ADR 0038).
      When("the lecturer drops {string} on {string} and it goes straight in", async (_, file: string, week: string) => {
        await drop(week, [file]);
        expect(proposal.plan).not.toBeNull();
        expect(await authoring.apply(proposal.plan!)).toEqual({ ok: true });
      });
      Then("the course shall have {string}", has);
      And("the history shall list the drop", () => expect(authoring.history()).toEqual([expect.objectContaining({ summary: proposal.plan!.summary, undone: false })]));
      When("the lecturer puts the drop back", async () => {
        const undo = await authoring.planUndo(authoring.history()[0].id);
        if (!undo.ok) throw new Error(undo.message);
        expect(await authoring.apply(undo.plan)).toEqual({ ok: true });
      });
      Then("the course shall have no {string}", hasNo);
    });
  });
});
