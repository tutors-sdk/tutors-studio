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
import { ASSISTANT_KEY, createPreferences } from "../../src/application/use-cases/preferences.ts";
import type { Explanation } from "../../src/application/ports/authoring.ts";
import type { PreferencesPort } from "../../src/application/ports/preferences.ts";
import type { Finding } from "../../src/domain/finding.ts";
import { FakeClaude } from "../../tests/support/fake-claude.ts";

const feature = await loadFeature("spec/features/assistant.feature");
const COURSE = "/home/lecturer/web-dev";
const PAGE = "Flexbox lays out a row of boxes; grid lays out rows and columns.";

describeFeature(feature, ({ Rule }) => {
  let settings: MemorySettings;
  let secrets: MemorySecrets;
  let preferences: PreferencesPort;
  let claude: FakeClaude;
  let fs: MemoryFileSystem;
  let finding: Finding;
  let explanation: Explanation;

  const course = (allowed: boolean) => (_: unknown, week: string) => {
    fs = new MemoryFileSystem({
      "course.md": "# Web Development\n",
      "topic-01/topic.md": "# Week 1\n",
      "topic-01/talk-01/talk.md": `# Layout\n\n${PAGE}\n`,
      [`${week}/topic.md`]: `# ${week}\n`,
    });
    settings = new MemorySettings({ remoteOptIn: allowed ? [COURSE] : [] });
    secrets = new MemorySecrets();
    preferences = createPreferences({ settings, secrets });
  };
  const choseClaude = (claudeKey: string) => async () => {
    claude = new FakeClaude(undefined, { key: claudeKey });
    await preferences.setAssistant("anthropic", "claude-opus-5-5");
    await preferences.setAssistantKey("sk-ant-good");
  };
  const asks = async (_: unknown, path: string) => {
    const assistant = chosenAssistant({ preferences, course: COURSE, providers: { anthropic: (options) => anthropicAssistant({ ...options, fetch: claude.fetch }) } });
    const authoring = createAuthoring({ fs, rules: courseRules, assistant, telemetry: new LocalTelemetry(), newId: () => "plan-1" });
    finding = (await authoring.refresh()).findings.find((candidate) => candidate.path === path)!;
    explanation = await authoring.explain(finding);
  };
  const rulesOwn = () => expect(explanation).toMatchObject({ text: finding.message, by: "rules" });
  const says = (_: unknown, sentence: string) => expect(explanation.problem).toBe(sentence);

  Rule("Where the lecturer has chosen Claude, the Studio shall explain a finding in Claude's words, sending Claude only that finding.", ({ RuleScenario }) => {
    RuleScenario("Claude explains why Week 3 is missing", ({ Given, When, Then, And }) => {
      Given("a course with a folder named {string} that the lecturer allowed Claude to read", course(true));
      And("the lecturer has chosen Claude with a working API key", choseClaude("sk-ant-good"));
      When("the lecturer asks for an explanation of {string}", asks);
      Then("the explanation shall be Claude's answer", () => {
        expect(explanation).toEqual({ text: "Students won't see Week 3. Rename the folder to topic-week-3 and it will appear.", by: "assistant", problem: "" });
      });
      And("Claude shall have been sent the rule's message for {string}", (_: unknown, path: string) => {
        expect(claude.requests).toHaveLength(1);
        expect(claude.requests[0].body.messages[0].content).toContain(`Where: ${path}`);
        expect(claude.requests[0].body.messages[0].content).toContain(finding.message);
      });
      And("Claude shall not have been sent anything from the course's pages", () => expect(claude.sent()).not.toContain(PAGE));
    });
  });

  Rule(
    "If the lecturer has not allowed Claude to read a course, then the Studio shall send Claude nothing from that course and explain with the rule's own message.",
    ({ RuleScenario }) => {
      RuleScenario("A course Claude may not read", ({ Given, When, Then, And }) => {
        Given("a course with a folder named {string} that the lecturer has not allowed Claude to read", course(false));
        And("the lecturer has chosen Claude with a working API key", choseClaude("sk-ant-good"));
        When("the lecturer asks for an explanation of {string}", asks);
        Then("the explanation shall be the rule's own message", rulesOwn);
        And("the Studio shall say {string}", says);
        And("Claude shall have been sent nothing", () => expect(claude.requests).toEqual([]));
      });
    },
  );

  Rule("If Claude refuses the API key, then the Studio shall explain with the rule's own message and say how to make a new key.", ({ RuleScenario }) => {
    RuleScenario("A revoked key", ({ Given, When, Then, And }) => {
      Given("a course with a folder named {string} that the lecturer allowed Claude to read", course(true));
      And("the lecturer has chosen Claude with an API key Claude refuses", choseClaude("sk-ant-revoked-replacement"));
      When("the lecturer asks for an explanation of {string}", asks);
      Then("the explanation shall be the rule's own message", rulesOwn);
      And("the Studio shall say {string}", says);
    });
  });

  Rule("The Studio shall keep the Claude API key in the computer's keychain and never in its settings.", ({ RuleScenario }) => {
    RuleScenario("Pasting a key in Settings", ({ Given, When, Then, And }) => {
      let key = "";
      Given("a lecturer with no assistant chosen", () => course(true)(undefined, "Week 3"));
      When("the lecturer chooses Claude and pastes the key {string}", async (_: unknown, pasted: string) => {
        key = pasted;
        await preferences.setAssistant("anthropic", "claude-opus-5-5");
        await preferences.setAssistantKey(`  ${pasted}  `);
      });
      Then("the keychain shall hold the key", async () => expect(await secrets.get(ASSISTANT_KEY)).toBe(key));
      And("no setting shall hold the key", async () => {
        const stored = await Promise.all((["assistant", "assistantModel", "remoteOptIn", "environment", "recentCourses", "appearance"] as const).map((name) => settings.get(name)));
        expect(JSON.stringify(stored)).not.toContain(key);
      });
      And("Settings shall say a key is set", async () => expect(await preferences.assistant()).toEqual({ provider: "anthropic", model: "claude-opus-5-5", keySet: true }));
    });
  });
});
