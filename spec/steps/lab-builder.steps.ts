import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { noAssistant } from "../../src/adapters/assistant/none/none-assistant.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "../../src/adapters/telemetry/local/local-telemetry.ts";
import { createAuthoring } from "../../src/application/use-cases/authoring.ts";
import type { ArrangePlan, AuthoringPort } from "../../src/application/ports/authoring.ts";
import type { LabChange } from "../../src/domain/lab-steps.ts";

const feature = await loadFeature("spec/features/lab-builder.feature");
const LAB = "topic-01/lab-01";

describeFeature(feature, ({ Rule }) => {
  let fs: MemoryFileSystem;
  let authoring: AuthoringPort;
  let proposal: ArrangePlan;

  const lab = (_: unknown, folder: string, first: string, second: string) => {
    const page = (file: string) => `# ${file.replace(/^\d+\.|\.md$/g, "")}\n\nDo this.\n`;
    fs = new MemoryFileSystem({
      "course.md": "# Web Development\n",
      "netlify.toml": '[build]\n  publish = "json"\n',
      "topic-01/topic.md": "# Week 1\n",
      [`${folder}/${first}`]: page(first),
      [`${folder}/${second}`]: page(second),
    });
    authoring = createAuthoring({ fs, rules: courseRules, assistant: noAssistant, telemetry: new LocalTelemetry(), newId: () => "plan-1" });
  };
  const change = async (wanted: LabChange) => {
    proposal = await authoring.planLabStep(LAB, wanted);
  };
  const accept = async () => {
    if (!proposal.ok) throw new Error(proposal.message);
    expect(await authoring.apply(proposal.plan)).toEqual({ ok: true });
  };
  const stepsAre = async (_: unknown, list: string) => expect((await authoring.labSteps(LAB)).map((step) => step.file).join(", ")).toBe(list);
  const noErrors = async () => expect((await authoring.refresh()).findings.filter((f) => f.severity === "error")).toEqual([]);
  const reads = (_: unknown, path: string, heading: string) => expect(fs.snapshot()[path]?.split("\n")[0]).toBe(heading);
  const says = (_: unknown, words: string) => {
    expect(proposal.ok).toBe(false);
    if (!proposal.ok) expect(proposal.message).toContain(words);
  };
  const given = "a lab {string} with the steps {string} and {string}";

  Rule(
    "When a lecturer adds a step to a lab by its title, the Studio shall propose a plan that writes the next numbered step page, titled as typed, at the end of the lab.",
    ({ RuleScenario }) => {
      RuleScenario("A third step", ({ Given, When, Then, And }) => {
        Given(given, lab);
        When("the lecturer adds the step {string}", (_, title: string) => change({ do: "add", title }));
        Then("the plan shall write {string}", (_, path: string) => expect(proposal.ok && proposal.plan.ops.map((op) => (op.op === "write" ? op.path : op.to))).toEqual([path]));
        When("the lecturer accepts the plan", accept);
        Then("the lab's steps shall be {string}", stepsAre);
        And("the course shall have no errors", noErrors);
      });
    },
  );

  Rule(
    "When a lecturer moves a lab step earlier or later, the Studio shall propose a plan that renumbers the steps in their new order, keeping every page as it is.",
    ({ RuleScenario }) => {
      RuleScenario("Grid before setup", ({ Given, When, Then, And }) => {
        Given(given, lab);
        When("the lecturer moves {string} earlier", (_, file: string) => change({ do: "move", file, by: -1 }));
        And("the lecturer accepts the plan", accept);
        Then("the lab's steps shall be {string}", stepsAre);
        And("{string} shall still read {string}", reads);
      });
      RuleScenario("The first step can't go earlier", ({ Given, When, Then }) => {
        Given(given, lab);
        When("the lecturer moves {string} earlier", (_, file: string) => change({ do: "move", file, by: -1 }));
        Then("Studio shall say {string}", says);
      });
    },
  );

  Rule(
    "When a lecturer renames or removes a lab step, the Studio shall propose a plan that renames the page and its heading, or moves it to the bin and renumbers the steps after it.",
    ({ RuleScenario }) => {
      RuleScenario("Renaming a step", ({ Given, When, Then, And }) => {
        Given(given, lab);
        When("the lecturer renames {string} to {string}", (_, file: string, title: string) => change({ do: "retitle", file, title }));
        And("the lecturer accepts the plan", accept);
        Then("the lab's steps shall be {string}", stepsAre);
        And("{string} shall still read {string}", reads);
      });
      RuleScenario("Removing the first step", ({ Given, When, Then, And }) => {
        Given(given, lab);
        When("the lecturer removes {string}", (_, file: string) => change({ do: "remove", file }));
        And("the lecturer accepts the plan", accept);
        Then("the lab's steps shall be {string}", stepsAre);
        And("the bin shall hold {string}", (_, name: string) => expect(Object.keys(fs.snapshot())).toContain(`.tutors-bin/${name}`));
        And("the course shall have no errors", noErrors);
      });
    },
  );

  Rule(
    "When a lecturer chooses a picture for a lab step, the Studio shall propose a plan that copies it into the lab's img folder under a plain name and shows it at the end of the step.",
    ({ RuleScenario }) => {
      const choose = (_: unknown, name: string, file: string) => change({ do: "picture", file, picture: { path: name, bytes: new TextEncoder().encode("PICTURE") } });
      RuleScenario("A screenshot for the grid step", ({ Given, When, Then, And }) => {
        Given(given, lab);
        When("the lecturer chooses {string} for {string}", choose);
        And("the lecturer accepts the plan", accept);
        Then("{string} shall hold the picture", (_, path: string) => expect(fs.snapshot()[path]).toBe("PICTURE"));
        And("{string} shall end with {string}", (_, path: string, end: string) => expect(fs.snapshot()[path]?.trimEnd().endsWith(end)).toBe(true));
        And("the course shall have no errors", noErrors);
      });
      RuleScenario("A file that isn't a picture", ({ Given, When, Then }) => {
        Given(given, lab);
        When("the lecturer chooses {string} for {string}", choose);
        Then("Studio shall say {string}", says);
      });
    },
  );
});
