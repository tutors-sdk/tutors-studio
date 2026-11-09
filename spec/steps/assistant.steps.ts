import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "../../src/adapters/telemetry/local/local-telemetry.ts";
import { MemorySettings } from "../../src/adapters/settings/memory/memory-settings.ts";
import { MemorySecrets } from "../../src/adapters/secrets/memory/memory-secrets.ts";
import { anthropicAssistant } from "../../src/adapters/assistant/anthropic/anthropic-assistant.ts";
import { OLLAMA, ollamaAssistant, ollamaModels } from "../../src/adapters/assistant/ollama/ollama-assistant.ts";
import { createAuthoring } from "../../src/application/use-cases/authoring.ts";
import { chosenAssistant } from "../../src/application/use-cases/assistant.ts";
import { ASSISTANT_KEY, createPreferences } from "../../src/application/use-cases/preferences.ts";
import type { Explanation } from "../../src/application/ports/authoring.ts";
import type { PreferencesPort } from "../../src/application/ports/preferences.ts";
import type { Finding } from "../../src/domain/finding.ts";
import { suggestedLocalModel } from "../../src/domain/assistant.ts";
import { FakeClaude } from "../../tests/support/fake-claude.ts";
import { FakeOllama } from "../../tests/support/fake-ollama.ts";

const feature = await loadFeature("spec/features/assistant.feature");
const COURSE = "/home/lecturer/web-dev";
const PAGE = "Flexbox lays out a row of boxes; grid lays out rows and columns.";

describeFeature(feature, ({ Rule }) => {
  let settings: MemorySettings;
  let secrets: MemorySecrets;
  let preferences: PreferencesPort;
  let claude: FakeClaude;
  let ollama: FakeOllama;
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
    claude = new FakeClaude();
    ollama = new FakeOllama();
    preferences = createPreferences({ settings, secrets, localModels: ollamaModels({ fetch: (...args) => ollama.fetch(...args) }) });
  };
  const choseClaude = (claudeKey: string) => async () => {
    claude = new FakeClaude(undefined, { key: claudeKey });
    await preferences.setAssistant("anthropic", "claude-opus-5-5");
    await preferences.setAssistantKey("sk-ant-good");
  };
  const asks = async (_: unknown, path: string) => {
    const assistant = chosenAssistant({
      preferences,
      course: COURSE,
      providers: {
        anthropic: (options) => anthropicAssistant({ ...options, fetch: claude.fetch }),
        ollama: (options) => ollamaAssistant({ ...options, fetch: ollama.fetch }),
      },
    });
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

  const holds = (_: unknown, names: string) => {
    ollama.models = names.split(", ").map((name) => ({ name, size: { "gemma3:1b": 815_319_791, "llama3.2:3b": 2_019_393_189, "qwen3:8b": 5_225_387_923 }[name] ?? 1e9 }));
  };
  const choseLocal = async () => preferences.setAssistant("ollama", (await preferences.assistant()).model);

  Rule(
    "Where the lecturer has chosen a model on this computer, the Studio shall explain a finding with that model through Ollama, without asking to read the course first.",
    ({ RuleScenario }) => {
      RuleScenario("A model on this computer explains why Week 3 is missing", ({ Given, When, Then, And }) => {
        Given("a course with a folder named {string} that the lecturer has not allowed any remote assistant to read", course(false));
        And("Ollama on this computer has the models {string}", holds);
        And("the lecturer has chosen a model on this computer", choseLocal);
        When("the lecturer asks for an explanation of {string}", asks);
        Then("the explanation shall be the local model's answer", () =>
          expect(explanation).toEqual({ text: "Students won't see Week 3 until it is a week Tutors knows.", by: "assistant", problem: "" }),
        );
        And("Ollama shall have been sent the rule's message for {string} for the model {string}", (_: unknown, path: string, model: string) => {
          const chat = ollama.requests.filter((request) => request.url.endsWith("/api/chat"));
          expect(chat).toHaveLength(1);
          expect(chat[0].body?.model).toBe(model);
          expect(chat[0].body?.messages?.at(-1)?.content).toContain(`Where: ${path}`);
          expect(chat[0].body?.messages?.at(-1)?.content).toContain(finding.message);
          expect(ollama.sent()).not.toContain(PAGE);
        });
        And("nothing shall have gone anywhere but Ollama on this computer", () => {
          expect(claude.requests).toEqual([]);
          expect(ollama.requests.every((request) => request.url.startsWith(`${OLLAMA}/`))).toBe(true);
        });
      });
    },
  );

  Rule("If Ollama is not running on this computer, then the Studio shall explain with the rule's own message and say how to start Ollama.", ({ RuleScenario }) => {
    RuleScenario("Ollama is closed", ({ Given, When, Then, And }) => {
      Given("a course with a folder named {string} that the lecturer allowed Claude to read", course(true));
      And("the lecturer chose a model on this computer while Ollama was open", async () => {
        holds(undefined, "llama3.2:3b");
        await choseLocal();
      });
      And("Ollama has since been closed", () => {
        ollama = new FakeOllama(ollama.models, { running: false });
      });
      When("the lecturer asks for an explanation of {string}", asks);
      Then("the explanation shall be the rule's own message", rulesOwn);
      And("the Studio shall say {string}", says);
    });
  });

  Rule(
    "When the lecturer chooses a model on this computer, the Studio shall offer the models Ollama already has, smallest first, and use the smallest until the lecturer picks another.",
    ({ RuleScenario }) => {
      RuleScenario("Choosing a model on this computer in Settings", ({ Given, When, Then, And }) => {
        Given("a lecturer with no assistant chosen", () => course(true)(undefined, "Week 3"));
        And("Ollama on this computer has the models {string}", holds);
        When("the lecturer chooses a model on this computer in Settings", choseLocal);
        Then("Settings shall offer {string}", async (_: unknown, names: string) =>
          expect((await preferences.localModels())?.map((model) => model.name)).toEqual(names.split(", ")),
        );
        And("Settings shall show the chosen model as {string}", async (_: unknown, model: string) =>
          expect(await preferences.assistant()).toMatchObject({ provider: "ollama", model }),
        );
        When("the lecturer picks the model {string}", (_: unknown, model: string) => preferences.setAssistant("ollama", model));
        Then("Settings shall show the chosen model as {string} from then on", async (_: unknown, model: string) =>
          expect(await preferences.assistant()).toMatchObject({ provider: "ollama", model }),
        );
      });
    },
  );

  Rule("If Ollama has no models, then the Studio shall offer to download a small one and choose it once it is downloaded.", ({ RuleScenario }) => {
    RuleScenario("A fresh Ollama", ({ Given, When, Then, And }) => {
      Given("a lecturer with no assistant chosen", () => course(true)(undefined, "Week 3"));
      And("Ollama on this computer has no models", async () => expect(await preferences.localModels()).toEqual([]));
      When("the lecturer downloads the suggested model in Settings", () => preferences.downloadLocalModel(suggestedLocalModel.name));
      Then("Ollama shall have been asked to download {string}", (_: unknown, model: string) =>
        expect(ollama.requests.filter((request) => request.url.endsWith("/api/pull")).map((request) => request.body?.model)).toEqual([model]),
      );
      And("the lecturer's assistant shall be a model on this computer, {string}", async (_: unknown, model: string) =>
        expect(await preferences.assistant()).toMatchObject({ provider: "ollama", model }),
      );
    });
  });
});
