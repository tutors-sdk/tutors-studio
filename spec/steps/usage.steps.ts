import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "../../src/adapters/telemetry/local/local-telemetry.ts";
import { MemorySettings } from "../../src/adapters/settings/memory/memory-settings.ts";
import { MemorySecrets } from "../../src/adapters/secrets/memory/memory-secrets.ts";
import { anthropicAssistant } from "../../src/adapters/assistant/anthropic/anthropic-assistant.ts";
import { createAuthoring } from "../../src/application/use-cases/authoring.ts";
import { chosenAssistant } from "../../src/application/use-cases/assistant.ts";
import { createPreferences } from "../../src/application/use-cases/preferences.ts";
import { countingTelemetry, createUsage } from "../../src/application/use-cases/usage.ts";
import type { UsagePort } from "../../src/application/ports/usage.ts";
import { FakeClaude } from "../../tests/support/fake-claude.ts";

const feature = await loadFeature("spec/features/usage.feature");
const COURSE = "/home/lecturer/web-dev";
const LAB = "topic-01/lab-01-grid";
const NOTES = "Grid notes: make a container with display grid.";
const DRAFT = "# Make the grid\n\nGive the container `display: grid`.\n";

describeFeature(feature, ({ Rule }) => {
  let settings: MemorySettings;
  let usage: ReturnType<typeof createUsage>;
  let claude: FakeClaude;
  let fs: MemoryFileSystem;
  let copied: string;

  const given = async () => {
    fs = new MemoryFileSystem({
      "course.md": "# Web Development\n",
      "netlify.toml": '[build]\n  publish = "json"\n',
      "topic-01/topic.md": "# Week 1\n",
      [`${LAB}/01.Setup.md`]: "# Setup\n\nOpen the starter.\n",
    });
    settings = new MemorySettings({ remoteOptIn: [COURSE] });
    usage = createUsage({ settings, version: async () => "0.1.0" });
    const preferences = createPreferences({ settings, secrets: new MemorySecrets() });
    claude = new FakeClaude(DRAFT);
    await preferences.setAssistant("anthropic", "claude-opus-5-5");
    await preferences.setAssistantKey("sk-ant-good");
  };
  const draftAndAccept = async () => {
    const preferences = createPreferences({ settings, secrets: new MemorySecrets() });
    await preferences.setAssistantKey("sk-ant-good");
    const assistant = chosenAssistant({ preferences, course: COURSE, providers: { anthropic: (options) => anthropicAssistant({ ...options, fetch: claude.fetch }) } });
    const authoring = createAuthoring({ fs, rules: courseRules, assistant, telemetry: countingTelemetry(new LocalTelemetry(), usage), newId: () => "plan-1" });
    await authoring.refresh();
    const proposal = await authoring.planLabDraft(LAB, NOTES);
    if (!proposal.ok) throw new Error(proposal.message);
    expect(await authoring.apply(proposal.plan)).toEqual({ ok: true });
    await usage.record("");
  };
  const turnOn = () => usage.setCounting(true);
  const shows = async (port: UsagePort, words: string) => (await port.counts()).find((line) => line.words === words)?.count;
  const givenText = 'a course whose lab "Grid" already has a step, and Claude chosen to draft it';
  const showsStep = async (_: unknown, count: number, words: string) => expect(await shows(usage, words)).toBe(count);

  Rule(
    "Where a lecturer has turned on usage counts, the Studio shall count each publish, save, accepted change, Git hand-off and assistant draft or suggestion as a number by name on this computer.",
    ({ RuleScenario }) => {
      RuleScenario("A lab drafted and accepted is counted", ({ Given, When, Then, And }) => {
        Given(givenText, given);
        And("the lecturer has turned on usage counts", turnOn);
        When("the lecturer asks Claude to draft the lab and accepts the plan", draftAndAccept);
        Then("Settings shall show {int} for {string}", showsStep);
        And("Settings shall show {int} for {string}", showsStep);
        And("the settings shall hold numbers by name and nothing from the course", async () => {
          expect(await settings.get("usageCounts")).toEqual({ "assistant.drafted": 1, "plan.applied": 1 });
        });
      });
    },
  );

  Rule("The Studio shall keep usage counts off until the lecturer turns them on, and count nothing while they are off.", ({ RuleScenario }) => {
    RuleScenario("Nothing counted before the lecturer turns counting on", ({ Given, When, Then, And }) => {
      Given(givenText, given);
      When("the lecturer asks Claude to draft the lab and accepts the plan", draftAndAccept);
      Then("usage counts shall be off", async () => {
        expect(await usage.counting()).toBe(false);
        expect(await settings.get("usageCounts")).toEqual({});
      });
      And("Settings shall show {int} for {string}", showsStep);
    });
  });

  Rule("When a lecturer turns usage counts off, the Studio shall clear the counts it kept.", ({ RuleScenario }) => {
    RuleScenario("Turning counting off clears it", ({ Given, When, Then, And }) => {
      Given(givenText, given);
      And("the lecturer has turned on usage counts", turnOn);
      And("the lecturer asks Claude to draft the lab and accepts the plan", draftAndAccept);
      When("the lecturer turns off usage counts", () => usage.setCounting(false));
      Then("Settings shall show {int} for {string}", showsStep);
      And("turning counting on again shall show {int} for {string}", async (_, count: number, words: string) => {
        await turnOn();
        expect(await shows(usage, words)).toBe(count);
      });
    });
  });

  Rule(
    "When a lecturer copies the usage counts, the Studio shall give only Studio's version and the counts by name, with no file names, course names or course content.",
    ({ RuleScenario }) => {
      RuleScenario("The copied counts", ({ Given, When, Then, And }) => {
        Given(givenText, given);
        And("the lecturer has turned on usage counts", turnOn);
        And("the lecturer asks Claude to draft the lab and accepts the plan", draftAndAccept);
        When("the lecturer copies the usage counts", async () => {
          copied = await usage.report();
        });
        Then("the copy shall give Studio's version {string} and the counts by name", (_, version: string) => {
          expect(JSON.parse(copied)).toEqual({ studio: version, counts: { "assistant.drafted": 1, "plan.applied": 1 } });
        });
        And("the copy shall hold no file name, course name or words from the course", () => {
          for (const words of ["Web Development", "Grid", "lab-01", "Make the grid", NOTES, COURSE, "plan-1"]) expect(copied).not.toContain(words);
        });
      });
    },
  );
});
