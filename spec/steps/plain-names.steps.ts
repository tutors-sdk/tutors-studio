import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { noAssistant } from "../../src/adapters/assistant/none/none-assistant.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "../../src/adapters/telemetry/local/local-telemetry.ts";
import { createAuthoring } from "../../src/application/use-cases/authoring.ts";
import type { AuthoringPort, ItemPlan } from "../../src/application/ports/authoring.ts";
import { flatten } from "../../src/domain/course-map.ts";
import { plainKind } from "../../src/domain/plain-names.ts";

const feature = await loadFeature("spec/features/plain-names.feature");

describeFeature(feature, ({ Rule }) => {
  let fs: MemoryFileSystem;
  let authoring: AuthoringPort;
  let proposal: ItemPlan;
  let before: Record<string, string>;

  const weekOne = () => {
    fs = new MemoryFileSystem({
      "course.md": "# Web Development\n",
      "netlify.toml": '[build]\n  publish = "json"\n',
      "topic-01/topic.md": "# Week 1\n",
      "topic-01/lab-01/01.Setup.md": "# Setup\n\nInstall the tools.\n",
    });
    before = fs.snapshot();
    authoring = createAuthoring({ fs, rules: courseRules, assistant: noAssistant, telemetry: new LocalTelemetry(), newId: () => "plan-1" });
  };
  const add = async (word: string, title: string, folder: string, address?: string) => {
    proposal = await authoring.planItem(folder, word, title, address);
  };
  const makes = (_: unknown, folder: string, file: string) => {
    expect(proposal).toMatchObject({ ok: true, folder });
    if (!proposal.ok) return;
    expect(proposal.plan.ops.map((op) => (op.op === "write" ? op.path : op.to))).toContain(`${folder}/${file}`);
  };
  const accept = async () => {
    if (!proposal.ok) throw new Error(proposal.message);
    expect(await authoring.apply(proposal.plan)).toEqual({ ok: true });
  };
  const noErrors = async () => expect((await authoring.refresh()).findings.filter((f) => f.severity === "error")).toEqual([]);
  const shows = async (_: unknown, path: string, label: string, title: string) => {
    const node = flatten((await authoring.refresh()).map).find((n) => n.path === path)!;
    expect({ label: node.label, title: node.title, unpublished: node.unpublished }).toEqual({ label, title, unpublished: false });
  };
  const says = (_: unknown, words: string) => {
    expect(proposal.ok).toBe(false);
    if (!proposal.ok) expect(proposal.message).toContain(words);
  };

  Rule(
    "The Studio shall offer what a lecturer can add by the lecturer's own words, and map each word to the kind Tutors reads from a folder's name.",
    ({ RuleScenarioOutline }) => {
      RuleScenarioOutline("The words a lecturer uses", ({ Given, Then }, variables) => {
        Given("the words Studio offers", () => {});
        Then('"<word>" shall make a "<kind>"', () => expect(plainKind(variables.word)?.kind).toBe(variables.kind));
      });
    },
  );

  Rule(
    "When a lecturer adds a lecture, lab, reading, link or code repository to a week by its plain name and a title, the Studio shall propose a plan that makes the folder Tutors reads and its first files.",
    ({ RuleScenario }) => {
      RuleScenario("A lab and a lecture added to Week 1", ({ Given, When, Then, And }) => {
        Given('a course whose topic-01 is titled "Week 1" and already holds lab-01', weekOne);
        When("the lecturer adds a {string} called {string} to {string}", (_, word: string, title: string, folder: string) => add(word, title, folder));
        Then("the plan shall make {string} with {string}", makes);
        And("nothing shall have been written to the course", () => expect(fs.snapshot()).toEqual(before));
        When("the lecturer accepts the plan", accept);
        Then("{string} shall show as a {string} titled {string}", shows);
      });
      RuleScenario("A lecture added to Week 1", ({ Given, When, Then }) => {
        Given('a course whose topic-01 is titled "Week 1" and already holds lab-01', weekOne);
        When("the lecturer adds a {string} called {string} to {string}", (_, word: string, title: string, folder: string) => add(word, title, folder));
        Then("the plan shall make {string} with {string}", makes);
        When("the lecturer accepts the plan", accept);
        Then("the course shall have no errors", noErrors);
      });
      RuleScenario("A link with its address", ({ Given, When, Then }) => {
        Given('a course whose topic-01 is titled "Week 1" and already holds lab-01', weekOne);
        When("the lecturer adds a {string} called {string} at {string} to {string}", (_, word: string, title: string, address: string, folder: string) =>
          add(word, title, folder, address),
        );
        Then("the plan shall make {string} with {string}", makes);
        When("the lecturer accepts the plan", accept);
        Then("the course shall have no errors", noErrors);
      });
    },
  );

  Rule(
    "When a lecturer adds a week to the course or to a unit, the Studio shall propose a plan that makes the next numbered topic titled as the lecturer typed it.",
    ({ RuleScenario }) => {
      RuleScenario("Week 2 added to the course", ({ Given, When, Then }) => {
        Given('a course whose topic-01 is titled "Week 1" and already holds lab-01', weekOne);
        When("the lecturer adds a {string} called {string} to the course", (_, word: string, title: string) => add(word, title, ""));
        Then("the plan shall make {string} with {string}", makes);
        When("the lecturer accepts the plan", accept);
        Then("{string} shall show as a {string} titled {string}", shows);
      });
    },
  );

  Rule("If the lecturer's word, title, address or place can't make an item, then the Studio shall say what to change and propose no plan.", ({ RuleScenario }) => {
    RuleScenario("Answers Studio can't use", ({ Given, When, Then, And }) => {
      Given('a course whose topic-01 is titled "Week 1" and already holds lab-01', weekOne);
      When("the lecturer adds a {string} called {string} to {string}", (_, word: string, title: string, folder: string) => add(word, title, folder));
      Then("Studio shall say {string}", says);
      When("the lecturer then adds a {string} called {string} to {string}", (_, word: string, title: string, folder: string) => add(word, title, folder));
      Then("Studio shall also say {string}", says);
      When("the lecturer adds a {string} called {string} at {string} to {string}", (_, word: string, title: string, address: string, folder: string) =>
        add(word, title, folder, address),
      );
      Then("Studio shall still say {string}", says);
      When("the lecturer adds a {string} called {string} to the course", (_, word: string, title: string) => add(word, title, ""));
      Then("Studio shall say at last {string}", says);
      And("nothing shall have been written to the course", () => expect(fs.snapshot()).toEqual(before));
    });
  });
});
