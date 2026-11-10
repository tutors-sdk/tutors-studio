import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { memoryOwnFiles } from "../../src/adapters/own-files/memory/memory-own-files.ts";
import { noAssistant } from "../../src/adapters/assistant/none/none-assistant.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "../../src/adapters/telemetry/local/local-telemetry.ts";
import { createAuthoring } from "../../src/application/use-cases/authoring.ts";
import { createMyFiles, type MyFiles, type OwnEntry } from "../../src/application/use-cases/my-files.ts";
import type { AuthoringPort, MaterialPlan } from "../../src/application/ports/authoring.ts";

const feature = await loadFeature("spec/features/my-files.feature");
const OWN = "/home/ann/teaching";

describeFeature(feature, ({ Rule }) => {
  let own: MemoryFileSystem;
  let ownBefore: Record<string, string>;
  let myFiles: MyFiles;
  let listed: OwnEntry[];
  let course: MemoryFileSystem;
  let authoring: AuthoringPort;
  let proposal: MaterialPlan;

  const ownFolder = (_: unknown, ...paths: string[]) => {
    own = new MemoryFileSystem(Object.fromEntries(paths.map((path) => [path, path.endsWith(".md") ? `# ${path.slice(path.lastIndexOf("/") + 4, -3)}\n\nDo this.\n` : "%PDF"])));
    ownBefore = own.snapshot();
    myFiles = createMyFiles(memoryOwnFiles({ [OWN]: own }));
  };
  const chooses = async () => {
    await myFiles.open(OWN);
    listed = await myFiles.listing("");
  };
  const aCourse = (_: unknown, week: string) => {
    course = new MemoryFileSystem({ "course.md": "# Web Development\n", "netlify.toml": '[build]\n  publish = "json"\n', [`${week}/topic.md`]: "# Week 1\n" });
    authoring = createAuthoring({ fs: course, rules: courseRules, assistant: noAssistant, telemetry: new LocalTelemetry(), newId: () => "plan-1" });
  };
  const entry = async (name: string) => {
    await chooses();
    return listed.find((candidate) => candidate.name === name)!;
  };
  const adds = (_: unknown, title: string, folder: string, label: string) => expect(proposal.placed).toContainEqual({ label, title, folder });
  const given = "a folder of the lecturer's own holding {string}, {string}, {string} and {string}";

  Rule("When a lecturer chooses a folder of their own material, the Studio shall list what is in it by name, folders first, and never write to it.", ({ RuleScenario }) => {
    RuleScenario("A folder of slides and a lab", ({ Given, When, Then }) => {
      Given(given, ownFolder);
      When("the lecturer chooses that folder", chooses);
      Then("My files shall list {string}", (_, names: string) => expect(listed.map((found) => found.name).join(", ")).toBe(names));
    });
  });

  Rule(
    "When a lecturer drags a file or folder from My files onto a week, the Studio shall propose the plan dropping it on that week would, copying it into the course.",
    ({ RuleScenario }) => {
      RuleScenario("A lab folder dragged onto Week 1", ({ Given, When, Then, And }) => {
        Given(given, ownFolder);
        And("a course with a week {string}", aCourse);
        When("the lecturer drags {string} onto {string}", async (_, name: string, week: string) => {
          proposal = await authoring.planMaterial(week, await myFiles.dropped(await entry(name)));
        });
        Then("the plan shall add a Lab {string} as {string}", (_, title: string, folder: string) => adds(_, title, folder, "Lab"));
        When("the lecturer accepts the plan", async () => {
          expect(await authoring.apply(proposal.plan!)).toEqual({ ok: true });
        });
        Then("the lecturer's own folder shall be as it was", () => expect(own.snapshot()).toEqual(ownBefore));
      });
    },
  );

  Rule("When a lecturer puts a file left in the tray in a week, the Studio shall propose placing it in that week.", ({ RuleScenario }) => {
    RuleScenario("Slides with no week in their name", ({ Given, When, Then, And }) => {
      let tray: MaterialPlan["tray"];
      Given(given, ownFolder);
      And("a course with a week {string}", aCourse);
      When("the lecturer drops {string} on the course", async (_, name: string) => {
        tray = (await authoring.planMaterial("", await myFiles.dropped(await entry(name)))).tray;
      });
      Then("the tray shall hold {string}", (_, name: string) => expect(tray.map((file) => file.path)).toContain(name));
      When("the lecturer puts {string} in {string}", async (_, name: string, week: string) => {
        proposal = await authoring.planMaterial(week, await myFiles.dropped(await entry(name)));
      });
      Then("the plan shall add a Talk {string} as {string}", (_, title: string, folder: string) => adds(_, title, folder, "Talk"));
    });
  });
});
