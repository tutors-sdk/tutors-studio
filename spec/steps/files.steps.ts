import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { noAssistant } from "../../src/adapters/assistant/none/none-assistant.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "../../src/adapters/telemetry/local/local-telemetry.ts";
import { createAuthoring } from "../../src/application/use-cases/authoring.ts";
import { planLoadedCourse } from "../../src/application/use-cases/load-course.ts";
import type { AttachResult, AuthoringPort, OpenedPage, PagePlan } from "../../src/application/ports/authoring.ts";
import type { Attachment } from "../../src/domain/attachments.ts";
import type { FileOp, Plan } from "../../src/domain/plan.ts";
import type { DroppedFile } from "../../src/domain/material.ts";

const feature = await loadFeature("spec/features/files.feature");
const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** A dropped or attached file: a page its heading, anything else a few bytes of its kind. */
const file = (path: string, body?: string): DroppedFile => {
  const name = path.slice(path.lastIndexOf("/") + 1);
  if (body !== undefined) return { path, bytes: encoder.encode(body) };
  if (name.endsWith(".md")) return { path, bytes: encoder.encode(`# ${name.replace(/^\d+\s*/, "").slice(0, -3)}\n\nDo this.\n`) };
  return { path, bytes: encoder.encode(/\.pdf$/i.test(name) ? "%PDF-1.7" : name.endsWith(".zip") ? "PK\u0003\u0004" : `bytes of ${name}`) };
};

/** The names a stored zip holds, read from its central directory. */
function zipNames(bytes: Uint8Array): string[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.length - 22;
  expect(view.getUint32(end, true)).toBe(0x06054b50);
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    expect(view.getUint32(at, true)).toBe(0x02014b50);
    const length = view.getUint16(at + 28, true);
    names.push(decoder.decode(bytes.subarray(at + 46, at + 46 + length)));
    at += 46 + length + view.getUint16(at + 30, true) + view.getUint16(at + 32, true);
  }
  return names;
}

describeFeature(feature, ({ Rule }) => {
  let fs: MemoryFileSystem;
  let authoring: AuthoringPort;
  let plan: Plan | null;
  let opened: OpenedPage;
  let attached: AttachResult;
  let saved: PagePlan;
  let before: Record<string, string>;

  const course = (files: Record<string, string>) => {
    fs = new MemoryFileSystem({ "course.md": "# Web Development\n", "netlify.toml": '[build]\n  publish = "json"\n', ...files });
    before = fs.snapshot();
    authoring = createAuthoring({ fs, rules: courseRules, assistant: noAssistant, telemetry: new LocalTelemetry(), newId: () => "plan-1" });
  };
  const aWeek = () => course({ "topic-01/topic.md": "# Week 1\n" });
  const writes = (): Extract<FileOp, { op: "write" }>[] => (plan?.ops ?? []).filter((op): op is Extract<FileOp, { op: "write" }> => op.op === "write");
  /** The write at a path, or, for a course made from material (whose weeks sit in units), the one ending with it. */
  const written = (path: string) => writes().find((op) => op.path === path || op.path.endsWith(`/${path}`));
  const writesPath = (_: unknown, path: string) =>
    expect(
      written(path),
      `no write of ${path} in ${writes()
        .map((op) => op.path)
        .join(", ")}`,
    ).toBeDefined();
  const links = (_: unknown, page: string, address: string) => {
    const content = written(page)?.content ?? (fs.snapshot()[page] === undefined ? undefined : encoder.encode(fs.snapshot()[page]));
    expect(decoder.decode(content!)).toContain(`](${address})`);
  };
  const isZipOf = (_: unknown, path: string, name: string) => expect(zipNames(written(path)!.content)).toEqual([name]);
  const accept = async () => expect(await authoring.apply(plan!)).toEqual({ ok: true });
  const noErrors = async () => expect((await authoring.refresh()).findings.filter((finding) => finding.severity === "error")).toEqual([]);
  const drop = async (folder: string, files: DroppedFile[]) => {
    plan = (await authoring.planMaterial(folder, files)).plan;
  };
  const attach = async (_: unknown, name: string, page: string) => {
    opened = await authoring.openPage(page);
    attached = await authoring.attach(page, file(name), []);
  };
  const savedAs = (_: unknown, path: string) => {
    expect(attached.ok).toBe(true);
    expect((attached as { attachment: Attachment }).attachment.path).toBe(path);
  };

  Rule(
    "When a lecturer adds a file Tutors doesn't publish, such as a Word document, as a note, the Studio shall put it, zipped, in the note's archives folder and link it from the note.",
    ({ RuleScenario }) => {
      RuleScenario("A Word document dropped on a week", ({ Given, When, Then, And }) => {
        Given('a course with a week "topic-01"', aWeek);
        When("the lecturer drops {string} on {string}", (_, name: string, week: string) => drop(week, [file(name)]));
        Then("the plan shall write {string}", writesPath);
        And("{string} shall be a zip holding {string}", isZipOf);
        And("{string} shall link {string}", links);
        And("the plan shall write nothing else into {string} but {string}", (_, folder: string, page: string) => {
          const straightIn = writes().filter((op) => op.path.startsWith(`${folder}/`) && !op.path.slice(folder.length + 1).includes("/"));
          expect(straightIn.map((op) => op.path)).toEqual([`${folder}/${page}`]);
        });
        When("the lecturer accepts the plan", accept);
        Then("the course shall have no errors", noErrors);
      });
      RuleScenario("A Word document in a folder of material made into a course", ({ Given, When, Then, And }) => {
        let material: DroppedFile[] = [];
        Given("a folder of material holding {string}", (_, path: string) => {
          material = [file(path)];
        });
        When("the lecturer makes it a course", () => {
          const made = planLoadedCourse(courseRules, { name: "Web Development", lecturer: "A Lecturer", start: null }, material, () => "plan-1");
          expect(made.ok).toBe(true);
          plan = made.ok ? made.load.plan : null;
        });
        Then("the plan shall write {string}", writesPath);
        And("{string} shall link {string}", links);
      });
    },
  );

  Rule(
    "When a lecturer adds a lab that holds files beside its steps, the Studio shall put each file other than a picture in the lab's archives folder and point the steps' links at it.",
    ({ RuleScenario }) => {
      RuleScenario("A lab folder with a handout and starter code beside its steps", ({ Given, When, Then, And }) => {
        Given('a course with a week "topic-01"', aWeek);
        When(
          "the lecturer drops a lab {string} whose {string} links {string}, with {string}, {string} and {string} beside it, on {string}",
          (_, lab: string, step: string, link: string, a: string, b: string, c: string, week: string) =>
            drop(week, [file(`${lab}/${step}`, `# Setup\n\nRead the [handout](${link}) first.\n`), file(`${lab}/02 Build.md`), ...[a, b, c].map((name) => file(`${lab}/${name}`))]),
        );
        Then("the plan shall write {string}", writesPath);
        And("the plan shall also write {string}", writesPath);
        And("the picture shall stay at {string}", writesPath);
        And("{string} shall link {string}", links);
        And("the plan shall write no PDF straight into {string}", (_, lab: string) =>
          expect(writes().filter((op) => op.path.startsWith(`${lab}/`) && !op.path.slice(lab.length + 1).includes("/") && op.path.endsWith(".pdf"))).toEqual([]),
        );
      });
    },
  );

  Rule(
    "When a lecturer makes a folder that holds a PDF into a lab, the Studio shall move the PDF into the lab's archives folder, so students still see the lab's steps.",
    ({ RuleScenario }) => {
      RuleScenario("A folder of steps and a PDF made into a lab", ({ Given, When, Then }) => {
        Given("a course whose week {string} holds a folder {string} with {string} and {string}", (_, week: string, folder: string, step: string, pdf: string) =>
          course({ [`${week}/topic.md`]: "# Week 1\n", [`${week}/${folder}/${step}`]: "# Setup\n", [`${week}/${folder}/${pdf}`]: "%PDF" }),
        );
        When("the lecturer makes {string} a {string}", async (_, folder: string, word: string) => {
          const made = await authoring.planVisible(folder, word);
          expect(made.ok).toBe(true);
          plan = made.ok ? made.plan : null;
        });
        Then("the plan shall move {string} to {string}", async (_, from: string, to: string) => {
          expect(plan!.ops).toContainEqual({ op: "move", from, to });
          await accept();
          expect(Object.keys(fs.snapshot()).filter((path) => path.endsWith(".pdf"))).toEqual([expect.stringMatching(/\/archives\/sheet\.pdf$/)]);
        });
      });
    },
  );

  Rule(
    "When a lecturer attaches a file while writing a note or a lab step, the Studio shall link it where they are writing and save it, with the page, in that page's archives folder.",
    ({ RuleScenario }) => {
      const aNote = (_: unknown, page: string, text: string) => course({ "topic-01/topic.md": "# Week 1\n", [page]: `${text}\n` });
      RuleScenario("A PDF attached to a note", ({ Given, When, Then, And }) => {
        Given("a course whose note {string} says {string}", aNote);
        When("the lecturer attaches {string} to {string}", attach);
        Then("the attachment shall be saved as {string}", savedAs);
        And("its link shall read {string} and point at {string}", (_, label: string, address: string) => {
          const attachment = (attached as { attachment: Attachment }).attachment;
          expect({ label: attachment.label, address: attachment.address }).toEqual({ label, address });
        });
        And("nothing shall have been written to the course", () => expect(fs.snapshot()).toEqual(before));
        When("the lecturer saves the page with the link added and accepts the plan", async () => {
          const attachment = (attached as { attachment: Attachment }).attachment;
          saved = await authoring.planPage(opened, `${opened.markdown}\n[${attachment.label}](${attachment.address})\n`, [attachment]);
          expect(saved.ok).toBe(true);
          plan = saved.ok ? saved.plan : null;
          await accept();
        });
        Then("the course shall have {string}", (_, path: string) => expect(fs.snapshot()[path]).toBe("%PDF-1.7"));
        And("{string} shall link {string}", links);
        And("the course shall have no errors", noErrors);
      });
      RuleScenario("An attachment whose link was taken out again", ({ Given, When, Then, And }) => {
        Given("a course whose note {string} says {string}", aNote);
        When("the lecturer attaches {string} to {string}", attach);
        And("the lecturer saves the page without the link", async () => {
          saved = await authoring.planPage(opened, `${opened.markdown}\nMore to read.\n`, [(attached as { attachment: Attachment }).attachment]);
          plan = saved.ok ? saved.plan : null;
        });
        Then("the plan shall write only {string}", (_, page: string) => expect(writes().map((op) => op.path)).toEqual([page]));
      });
      RuleScenario("Two files of the same name attached to a lab step", ({ Given, When, Then }) => {
        Given("a course whose lab {string} has a step {string} and already holds {string}", (_, lab: string, step: string, held: string) =>
          course({ "topic-01/topic.md": "# Week 1\n", [`${lab}/${step}`]: "# Setup\n", [`${lab}/${held}`]: "a,b\n" }),
        );
        When("the lecturer attaches {string} to {string}", attach);
        Then("the attachment shall be saved as {string}", savedAs);
      });
    },
  );

  Rule(
    "If a lecturer attaches a file to a page that is not a note or a lab step, then the Studio shall attach nothing and say to drop the file on the week as its own card.",
    ({ RuleScenario }) => {
      RuleScenario("A PDF attached to a week's page", ({ Given, When, Then }) => {
        Given('a course with a week "topic-01"', aWeek);
        When("the lecturer attaches {string} to {string}", attach);
        Then("Studio shall say {string}", (_, words: string) => {
          expect(attached.ok).toBe(false);
          expect((attached as { message: string }).message).toContain(words);
        });
      });
    },
  );

  Rule("When a lecturer attaches a file Tutors doesn't publish, the Studio shall save it zipped, so students can download it.", ({ RuleScenario }) => {
    RuleScenario("A Word template attached to a lab step", ({ Given, When, Then, And }) => {
      Given("a course whose lab {string} has a step {string}", (_, lab: string, step: string) => course({ "topic-01/topic.md": "# Week 1\n", [`${lab}/${step}`]: "# Setup\n" }));
      When("the lecturer attaches {string} to {string}", attach);
      Then("the attachment shall be saved as {string}", savedAs);
      And("{string} shall be a zip holding {string}", (_, path: string, name: string) => {
        const attachment = (attached as { attachment: Attachment }).attachment;
        expect(attachment.path).toBe(path);
        expect(zipNames(attachment.bytes)).toEqual([name]);
      });
    });
  });

  Rule("The Studio shall write the extension of every file it places in lower case, so Tutors publishes it.", ({ RuleScenario }) => {
    RuleScenario("Slides saved with an upper-case extension", ({ Given, When, Then }) => {
      Given('a course with a week "topic-01"', aWeek);
      When("the lecturer drops {string} on {string}", (_, name: string, week: string) => drop(week, [file(name)]));
      Then("the plan shall write {string}", writesPath);
      When("the lecturer accepts the plan", accept);
      Then("the course shall have no errors", noErrors);
    });
  });
});
