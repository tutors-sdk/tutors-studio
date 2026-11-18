import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "../../src/adapters/telemetry/local/local-telemetry.ts";
import { runPublishing } from "../../src/adapters/cli/headless/headless.ts";
import { tutorsGenBuild } from "../../src/adapters/build/tutors-gen/tutors-gen-build.ts";
import { netlifyHosting } from "../../src/adapters/hosting/netlify/netlify-hosting.ts";
import { MemorySecrets } from "../../src/adapters/secrets/memory/memory-secrets.ts";
import { createPublishing } from "../../src/application/use-cases/publishing.ts";
import { createNewCourse } from "../../src/application/use-cases/new-course.ts";
import { courseTemplates } from "../../src/domain/templates.ts";
import { defaultShape } from "../../src/domain/new-course.ts";
import { FakeComputer, FakeFolders } from "../../tests/support/fake-publishing.ts";

// The headless half of the bundle journeys. e2e/desktop/journeys.desktop.ts runs the @desktop scenarios
// through the window on Windows, with the same words (ADR 0047).
const feature = await loadFeature("spec/features/journeys.feature");

describeFeature(feature, ({ Rule }) => {
  let fs: MemoryFileSystem;
  let computer: FakeComputer;
  let folders: FakeFolders;
  let root: string;
  let folder: string;
  let online: boolean;
  let lines: string[];

  const onlyStudio = () => {
    fs = new MemoryFileSystem({});
    computer = new FakeComputer(fs, ["tutors-tools"]);
    folders = new FakeFolders(fs);
    online = true;
  };
  const noNetwork = () => void (online = false);
  const makes = async (_: unknown, name: string, template: string, parent: string) => {
    const id = courseTemplates.find((candidate) => candidate.name === template)?.id;
    expect(id, `a template called ${template}`).toBeDefined();
    const made = await createNewCourse(
      { rules: courseRules, newId: () => "new-1", makeFolder: async () => fs },
      { name, lecturer: "", weeks: 12, shape: defaultShape, project: false, template: id },
    );
    expect(made.ok).toBe(true);
    if (!made.ok) return;
    folder = made.folder;
    root = `${parent}/${folder}`;
  };
  const run = async (command: string, target = "") => {
    const publishing = createPublishing({
      fs,
      rules: courseRules,
      build: tutorsGenBuild(computer, root, null),
      hosting: netlifyHosting({
        secrets: new MemorySecrets(),
        fetch: async () => {
          if (!online) throw new Error("no network");
          return new Response("{}", { status: 401 });
        },
        sleep: async () => {},
      }),
      saveCopy: folders,
      telemetry: new LocalTelemetry(),
      newId: () => "save-1",
    });
    lines = [];
    expect(await runPublishing(publishing, command, (line) => lines.push(line), target, folder), lines.join("\n")).toBe(0);
  };
  const onlyTheTools = () => expect(computer.calls.filter((call) => !call.startsWith("tutors-tools "))).toEqual([]);

  Rule(
    "When a lecturer makes a new course on a computer with nothing but Studio installed, the Studio shall save it with the setup Tutors expects and build it with the Tutors tools inside Studio.",
    ({ RuleScenario }) => {
      RuleScenario("From a new course to the course in Tutors", ({ Given, When, And, Then }) => {
        Given("a computer with only Studio on it", onlyStudio);
        When("the lecturer makes a new course {string} from {string} in {string}", makes);
        And("the lecturer saves the course", () => run("save"));
        Then("the course folder holds {string}", async (_, file: string) => expect(await fs.exists(file)).toBe(true));
        When("the lecturer shows the course in Tutors", async () => {
          const built = await tutorsGenBuild(computer, root, null).build();
          expect(built.ok).toBe(true);
        });
        Then("Tutors shows {string}", async (_, title: string) => expect(new TextDecoder().decode(await fs.read("json/tutors.json"))).toContain(title));
        And("Studio ran no tool but the Tutors tools", onlyTheTools);
      });
    },
  );

  Rule(
    "When a lecturer saves a course as a website on a computer with no network, the Studio shall build it with the Tutors tools inside Studio and save it as a folder of web pages.",
    ({ RuleScenario }) => {
      RuleScenario("A website saved with the network off", ({ Given, And, When, Then }) => {
        Given("a computer with only Studio on it", onlyStudio);
        And("no network", noNetwork);
        When("the lecturer makes a new course {string} from {string} in {string}", makes);
        And("the lecturer saves the course as a website in {string}", (_, parent: string) => run("save-website", parent));
        Then("{string} holds {string}", (_, saved: string, file: string) => expect([...folders.files.keys()]).toContain(`${saved}/${file}`));
        And("Studio ran no tool but the Tutors tools", onlyTheTools);
      });
    },
  );
});
