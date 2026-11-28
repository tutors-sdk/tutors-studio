import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { noAssistant } from "../../src/adapters/assistant/none/none-assistant.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "../../src/adapters/telemetry/local/local-telemetry.ts";
import { createAuthoring } from "../../src/application/use-cases/authoring.ts";
import type { ArrangePlan, AuthoringPort } from "../../src/application/ports/authoring.ts";
import { firstOpen, guideProgress, guideSteps, guideWords, nextOpen, stillToDo, uploadFor, uploadWords, type GuideStep, type GuideWeek } from "../../src/domain/guided.ts";
import type { DroppedFile } from "../../src/domain/material.ts";
import type { FileOp } from "../../src/domain/plan.ts";

const feature = await loadFeature("spec/features/guided.feature");
const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** An uploaded file: a page its heading, anything else a few bytes of its kind. */
const file = (path: string, body?: string): DroppedFile => {
  if (body !== undefined) return { path, bytes: encoder.encode(body) };
  if (path.endsWith(".md")) return { path, bytes: encoder.encode(`# ${path.replace(/^\d+\s*/, "").slice(0, -3)}\n\nDo this.\n`) };
  return { path, bytes: encoder.encode(/\.pdf$/i.test(path) ? "%PDF-1.7" : path.endsWith(".zip") ? "PK\u0003\u0004" : `bytes of ${path}`) };
};

describeFeature(feature, ({ Rule }) => {
  let fs: MemoryFileSystem;
  let authoring: AuthoringPort;
  let planned: ArrangePlan;
  let weeks: GuideWeek[];
  let steps: GuideStep[];
  let at: number;
  let ids = 0;

  const open = (files: Record<string, string>) => {
    fs = new MemoryFileSystem(files);
    authoring = createAuthoring({ fs, rules: courseRules, assistant: noAssistant, telemetry: new LocalTelemetry(), newId: () => `plan-${++ids}` });
  };
  const newCourse = () =>
    open(
      Object.fromEntries(
        courseRules
          .newCourseFiles({ name: "Programming", lecturer: "A Lecturer", weeks: 2, shape: { lectures: 1, labs: 1, readings: 0 }, project: false })
          .map((made) => [made.path, made.content]),
      ),
    );
  const aWeekWith = (kind: string, title: string, page: string) =>
    open({
      "course.md": "# Programming\n",
      "netlify.toml": '[build]\n  publish = "json"\n',
      "topic-01/topic.md": "# Arrays\n",
      [`topic-01/${kind}-01/${kind}.md`]: page.replace("TITLE", title),
    });
  const STARTER_NOTE = "---\nicon:\n  type: fluent-color:notebook-24\n---\n\n# TITLE\n\nSummary of this note (appears on the note card).\n";

  const itemOf = async (kind: string, week: number) => {
    const found = (await authoring.guide())[week - 1].items.find((item) => item.kind === kind);
    expect(found).toBeDefined();
    return found!;
  };
  const lectureOf = (week: number) => itemOf("talk", week).then((item) => item.path);
  const labOf = (week: number) => itemOf("lab", week).then((item) => item.path);
  const upload = async (item: string, files: DroppedFile[]) => {
    planned = await authoring.planUpload(item, files);
  };
  const ops = (): FileOp[] => (planned.ok ? planned.plan.ops : []);
  const writes = () => ops().filter((op): op is Extract<FileOp, { op: "write" }> => op.op === "write");
  const writesInto = (folder: string, name: string) =>
    expect(
      writes().map((op) => op.path),
      planned.ok ? "" : planned.message,
    ).toContain(`${folder}/${name}`);
  const accept = async () => {
    expect(planned.ok, planned.ok ? "" : planned.message).toBe(true);
    if (planned.ok) expect(await authoring.apply(planned.plan)).toEqual({ ok: true });
  };
  const noErrors = async () => expect((await authoring.refresh()).findings.filter((finding) => finding.severity === "error").map((finding) => finding.message)).toEqual([]);
  const refused = (_: unknown, message: string) => {
    expect(planned.ok).toBe(false);
    expect(planned.ok ? "" : planned.message).toBe(message);
  };
  const start = async () => {
    weeks = await authoring.guide();
    steps = guideSteps(weeks);
    at = firstOpen(steps);
  };
  const heading = (step: GuideStep) => guideWords(step).heading;
  const retitle = async (week: number, title: string) => {
    const path = (await authoring.guide())[week - 1].path;
    planned = await authoring.planArrange({ action: "retitle", item: path, title });
    await accept();
  };
  const uploadSlides = async (name: string, week: number) => {
    await upload(await lectureOf(week), [file(name)]);
    await accept();
  };

  Rule("The Studio shall offer on each talk, tutorial, lab, reading and archive an upload button that names what that item takes.", ({ RuleScenario }) => {
    RuleScenario("Each item names what it takes", ({ Then, And }) => {
      Then("a {string} offers {string} for PDFs only", (_, kind: string, button: string) => {
        expect(uploadFor(kind)).toMatchObject({ button, many: false });
        expect(uploadFor(kind)!.accept).toContain(".pdf");
      });
      And("a {string} also offers {string} for PDFs only", (_, kind: string, button: string) => {
        expect(uploadFor(kind)).toMatchObject({ button, many: false });
        expect(uploadFor(kind)!.accept).toContain(".pdf");
      });
      And("a {string} offers {string} for several files", (_, kind: string, button: string) => expect(uploadFor(kind)).toMatchObject({ button, many: true, accept: "" }));
      And("a {string} also offers {string} for several files", (_, kind: string, button: string) => expect(uploadFor(kind)).toMatchObject({ button, many: true, accept: "" }));
      And("a {string} offers {string} for one file", (_, kind: string, button: string) => expect(uploadFor(kind)).toMatchObject({ button, many: false }));
      And("a {string} offers no upload", (_, kind: string) => expect(uploadFor(kind)).toBeNull());
      And("a {string} offers no upload either", (_, kind: string) => expect(uploadFor(kind)).toBeNull());
    });
  });

  Rule("When a lecturer uploads a PDF to a talk or a tutorial, the Studio shall put it in that item and move the slides it showed before to the bin.", ({ RuleScenario }) => {
    RuleScenario("Slides uploaded to a new course's lecture", ({ Given, When, Then, And }) => {
      Given("a new course of 2 weeks, each with a lecture and a lab", newCourse);
      When("the lecturer uploads {string} to the lecture of week {int}", async (_, name: string, week: number) => upload(await lectureOf(week), [file(name)]));
      Then("the plan shall write {string} into the lecture of week {int}", async (_, name: string, week: number) => writesInto(await lectureOf(week), name));
      And("the plan shall move the starter deck {string} to the bin", (_, name: string) =>
        expect(ops()).toContainEqual({ op: "move", from: expect.stringMatching(new RegExp(`/${name.replace(".", "\\.")}$`)), to: `.tutors-bin/${name}` }),
      );
      When("the lecturer accepts the plan", accept);
      Then("the lecture of week {int} shall have its material", async (_, week: number) => expect((await itemOf("talk", week)).done).toBe(true));
      And("the course shall have no errors", noErrors);
    });
    RuleScenario("New slides replace the old ones", ({ Given, When, Then, And }) => {
      Given("a new course of 2 weeks, each with a lecture and a lab", newCourse);
      And("the lecturer has uploaded {string} to the lecture of week {int}", (_, name: string, week: number) => uploadSlides(name, week));
      When("the lecturer uploads {string} to the lecture of week {int}", async (_, name: string, week: number) => upload(await lectureOf(week), [file(name)]));
      Then("the plan shall write {string} into the lecture of week {int}", async (_, name: string, week: number) => writesInto(await lectureOf(week), name));
      And("the plan shall move {string} to the bin", (_, name: string) =>
        expect(ops()).toContainEqual({ op: "move", from: expect.stringMatching(new RegExp(`/${name}$`)), to: `.tutors-bin/${name}` }),
      );
    });
  });

  Rule("If a lecturer uploads anything but one PDF to a talk or a tutorial, then the Studio shall upload nothing and say what to upload instead.", ({ RuleScenario }) => {
    RuleScenario("A PowerPoint file", ({ Given, When, Then }) => {
      Given("a new course of 2 weeks, each with a lecture and a lab", newCourse);
      When("the lecturer uploads {string} to the lecture of week {int}", async (_, name: string, week: number) => upload(await lectureOf(week), [file(name)]));
      Then("nothing is planned, and Studio says {string} isn't a PDF and to save the slides as a PDF", (_, name: string) => refused(_, uploadWords.notPdf(name)));
    });
    RuleScenario("Two PDFs at once", ({ Given, When, Then }) => {
      Given("a new course of 2 weeks, each with a lecture and a lab", newCourse);
      When("the lecturer uploads {string} and {string} to the lecture of week {int}", async (_, a: string, b: string, week: number) =>
        upload(await lectureOf(week), [file(a), file(b)]),
      );
      Then("nothing is planned, and Studio says {string}", refused);
    });
  });

  Rule(
    "When a lecturer uploads content to a lab, the Studio shall make each Markdown page a step, in the order of their names and in place of steps that still hold starter text, and keep every other file where the steps' links find it.",
    ({ RuleScenario }) => {
      const stepsGot = async (_: unknown, ...names: string[]) => {
        const lab = await labOf(1);
        const added = writes()
          .map((op) => op.path)
          .filter((path) => path.startsWith(`${lab}/`) && /^\d{2}\..+\.md$/.test(path.slice(lab.length + 1)));
        expect(added.map((path) => path.slice(lab.length + 1))).toEqual(names);
      };
      RuleScenario("A lab's pages, a picture and a handout", ({ Given, When, Then, And }) => {
        Given("a new course of 2 weeks, each with a lecture and a lab", newCourse);
        When(
          "the lecturer uploads {string} linking {string} and {string}, {string}, {string} and {string} to the lab of week {int}",
          async (_, setup: string, handout: string, picture: string, grid: string, a: string, b: string, week: number) =>
            upload(await labOf(week), [file(setup, `# Setup\n\nRead the [handout](${handout}), then look at ![the grid](${picture}).\n`), file(grid), file(a), file(b)]),
        );
        Then("the lab of week {int} shall get the steps {string} and {string}", (_, _week: number, a: string, b: string) => stepsGot(_, a, b));
        And("the plan shall move the lab's starting steps to the bin", async () => {
          const lab = await labOf(1);
          const binned = ops().filter((op) => op.op === "move" && op.from.startsWith(`${lab}/`) && op.to.startsWith(".tutors-bin/"));
          expect(binned.length).toBeGreaterThan(0);
        });
        And("the plan shall write {string} into the lab of week {int}", async (_, name: string, week: number) => writesInto(await labOf(week), name));
        And("the plan shall also write {string} into the lab of week {int}", async (_, name: string, week: number) => writesInto(await labOf(week), name));
        And("the step {string} shall link {string} and {string}", async (_, step: string, a: string, b: string) => {
          const lab = await labOf(1);
          const page = decoder.decode(writes().find((op) => op.path === `${lab}/${step}`)!.content);
          expect(page).toContain(`](${a})`);
          expect(page).toContain(`](${b})`);
        });
        When("the lecturer accepts the plan", accept);
        Then("the lab of week {int} shall have its material", async (_, week: number) => expect((await itemOf("lab", week)).done).toBe(true));
        And("the course shall have no errors", noErrors);
      });
      RuleScenario("More pages after the lecturer's own steps", ({ Given, When, Then, And }) => {
        Given("a new course of 2 weeks, each with a lecture and a lab", newCourse);
        And("the lecturer has uploaded {string} to the lab of week {int}", async (_, name: string, week: number) => {
          await upload(await labOf(week), [file(name)]);
          await accept();
        });
        When("the lecturer uploads {string} to the lab of week {int}", async (_, name: string, week: number) => upload(await labOf(week), [file(name)]));
        Then("the lab of week {int} shall get the steps {string}", (_, _week: number, a: string) => stepsGot(_, a));
        And("the plan shall move nothing to the bin", () => expect(ops().filter((op) => op.op === "move")).toEqual([]));
      });
    },
  );

  Rule("When a lecturer uploads to a reading, the Studio shall make a Markdown page the reading and attach every other file with a link from it.", ({ RuleScenario }) => {
    RuleScenario("A reading page and a Word handout", ({ Given, When, Then, And }) => {
      const page = () => decoder.decode(writes().find((op) => op.path === "topic-01/note-01/note.md")!.content);
      Given("a course with a week holding a reading {string}", (_, title: string) => aWeekWith("note", title, STARTER_NOTE));
      When("the lecturer uploads {string} and {string} to the reading", (_, a: string, b: string) =>
        upload("topic-01/note-01", [file(a, "# Background\n\nArrays hold many values.\n"), file(b)]),
      );
      Then("the reading's page shall hold the uploaded text under its card's icon", () => {
        expect(page()).toMatch(/^---\nicon:\n {2}type: fluent-color:notebook-24\n---\n# Background\n\nArrays hold many values\./);
      });
      And("the plan shall write {string} into the reading", (_, name: string) => writesInto("topic-01/note-01", name));
      And("the reading's page shall link {string}", (_, address: string) => expect(page()).toContain(`](${address})`));
      When("the lecturer accepts the plan", accept);
      Then("the reading shall have its material", async () => expect((await authoring.guide())[0].items[0].done).toBe(true));
    });
  });

  Rule("If a lecturer uploads a page to a reading they have already written, then the Studio shall upload nothing and say why.", ({ RuleScenario }) => {
    RuleScenario("A reading already written", ({ Given, When, Then }) => {
      Given("a course with a week holding a reading {string} the lecturer has written", (_, title: string) => aWeekWith("note", title, "# TITLE\n\nMy own words about arrays.\n"));
      When("the lecturer uploads {string} to the reading", (_, name: string) => upload("topic-01/note-01", [file(name)]));
      Then("nothing is planned, and Studio says {string}", refused);
    });
  });

  Rule("When a lecturer uploads a file to an archive, the Studio shall make it the archive's download, zipped when it is not a zip.", ({ RuleScenario }) => {
    const anArchive = (_: unknown, title: string) => aWeekWith("archive", title, "# TITLE\n\nStarter code for the week.\n");
    RuleScenario("Starter code that is a zip", ({ Given, When, Then }) => {
      Given("a course with a week holding an archive {string}", anArchive);
      When("the lecturer uploads {string} to the archive", (_, name: string) => upload("topic-01/archive-01", [file(name)]));
      Then("the plan shall write {string} into the archive", (_, name: string) => writesInto("topic-01/archive-01", name));
    });
    RuleScenario("A spreadsheet, zipped for download", ({ Given, When, Then }) => {
      Given("a course with a week holding an archive {string}", anArchive);
      When("the lecturer uploads {string} to the archive", (_, name: string) => upload("topic-01/archive-01", [file(name)]));
      Then("the plan shall write {string} into the archive", (_, name: string) => writesInto("topic-01/archive-01", name));
    });
  });

  Rule("Where a lecturer asks to be guided when making a new course, the Studio shall open the course at the guide's first step.", ({ RuleScenario }) => {
    RuleScenario("A new course starts the guide at week 1", ({ Given, When, Then, And }) => {
      Given("a new course of 2 weeks, each with a lecture and a lab", newCourse);
      When("the guide starts", start);
      Then("the guide is at {string}", (_, wanted: string) => expect(heading(steps[at])).toBe(wanted));
      And("the guide has {int} steps to do and {int} done", (_, of: number, done: number) => expect(guideProgress(steps)).toEqual({ done, of }));
    });
  });

  Rule(
    "The Studio's guide shall take the lecturer through each week in order, naming the week and then adding material to each of its items, and end with a check of the course.",
    ({ RuleScenario }) => {
      RuleScenario("The track through a two-week course", ({ Given, Then }) => {
        Given("a new course of 2 weeks, each with a lecture and a lab", newCourse);
        Then("the guide's steps are {string}", async (_, list: string) => {
          await start();
          expect(steps.map(heading).join(", ")).toBe(list);
        });
      });
    },
  );

  Rule("When a week has its own title or an item has its material, the Studio's guide shall count that step as done and go on to the next step not done.", ({ RuleScenario }) => {
    RuleScenario("Naming week 1 and uploading its slides", ({ Given, When, Then, And }) => {
      Given("a new course of 2 weeks, each with a lecture and a lab", newCourse);
      When("the lecturer titles week {int} {string}", (_, week: number, title: string) => retitle(week, title));
      And("the lecturer uploads {string} to the lecture of week {int} and accepts it", (_, name: string, week: number) => uploadSlides(name, week));
      And("the guide starts", start);
      Then("the guide is at {string}", (_, wanted: string) => expect(heading(steps[at])).toBe(wanted));
      And("the guide has {int} steps to do and {int} done", (_, of: number, done: number) => expect(guideProgress(steps)).toEqual({ done, of }));
    });
  });

  Rule("When a lecturer skips a step, the Studio's guide shall go on to the next step not done and list the skipped step as still to do at the end.", ({ RuleScenario }) => {
    RuleScenario("Skipping a lab", ({ Given, When, Then, And }) => {
      Given("a new course of 2 weeks, each with a lecture and a lab", newCourse);
      When("the lecturer titles week {int} {string}", (_, week: number, title: string) => retitle(week, title));
      And("the lecturer uploads {string} to the lecture of week {int} and accepts it", (_, name: string, week: number) => uploadSlides(name, week));
      And("the guide starts", start);
      And("the lecturer skips the step", () => {
        at = nextOpen(steps, at);
      });
      Then("the guide is at {string}", (_, wanted: string) => expect(heading(steps[at])).toBe(wanted));
      When("the lecturer skips to the end", () => {
        while (steps[at].do !== "check") at = nextOpen(steps, at);
      });
      Then("the guide ends at {string}", (_, wanted: string) => expect(heading(steps[at])).toBe(wanted));
      And("the steps still to do are {string}", (_, list: string) => expect(stillToDo(steps).map(heading).join(", ")).toBe(list));
    });
  });

  Rule("When a lecturer goes back to the guide on a course, the Studio shall start it at the first step not done.", ({ RuleScenario }) => {
    RuleScenario("A course half built", ({ Given, When, Then, And }) => {
      Given("a new course of 2 weeks, each with a lecture and a lab", newCourse);
      When("the lecturer titles week {int} {string}", (_, week: number, title: string) => retitle(week, title));
      And("the lecturer also titles week {int} {string}", (_, week: number, title: string) => retitle(week, title));
      And("the guide starts", start);
      Then("the guide is at {string}", (_, wanted: string) => expect(heading(steps[at])).toBe(wanted));
    });
  });
});
