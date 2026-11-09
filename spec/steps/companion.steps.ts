import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { anthropicAssistant } from "../../src/adapters/assistant/anthropic/anthropic-assistant.ts";
import { noAssistant } from "../../src/adapters/assistant/none/none-assistant.ts";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { markdownItPages } from "../../src/adapters/markdown/markdown-it/markdown-it-pages.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { MemorySecrets } from "../../src/adapters/secrets/memory/memory-secrets.ts";
import { MemorySettings } from "../../src/adapters/settings/memory/memory-settings.ts";
import { LocalTelemetry } from "../../src/adapters/telemetry/local/local-telemetry.ts";
import { createCompanion, type CompanionAnswer } from "../../src/application/companion/companion.ts";
import { momentFor, moments, type CompanionEvent, type CompanionState, type Moment } from "../../src/application/companion/moments.ts";
import type { AuthoringPort, OpenedPage, PagePlan } from "../../src/application/ports/authoring.ts";
import type { PreferencesPort } from "../../src/application/ports/preferences.ts";
import { chosenAssistant } from "../../src/application/use-cases/assistant.ts";
import { createAuthoring } from "../../src/application/use-cases/authoring.ts";
import { createPreferences } from "../../src/application/use-cases/preferences.ts";
import { workspaceFeatures } from "../../src/domain/workspace.ts";
import { FakeClaude } from "../../tests/support/fake-claude.ts";

const feature = await loadFeature("spec/features/companion.feature");
const NOW = 100_000_000;
const COURSE = "/home/lecturer/web-dev";
const PAGE_TEXT = "Flexbox lays out a row of boxes.";
const PAGE = "topic-01/talk-01/talk.md";
const SOURCE = `# Layout\n\n${PAGE_TEXT}\n\n<script>alert(1)</script>\n`;
const CONTEXT = { where: "Week 3", problems: ["Week 3 won't be published."] };
const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

describeFeature(feature, ({ Rule }) => {
  let state: CompanionState;
  let spoken: Map<string, number>;
  let moment: Moment | null;
  let settings: MemorySettings;
  let preferences: PreferencesPort;
  let claude: FakeClaude | null;
  let answer: CompanionAnswer;
  let fs: MemoryFileSystem;
  let authoring: AuthoringPort;
  let opened: OpenedPage;
  let plan: PagePlan;

  const withErrors = (_: unknown, errors: number) => {
    state = { errors, emptyWeek: false, needsPermission: false, busy: false, hidden: false };
    spoken = new Map();
  };
  const opens = () => void (moment = momentFor("course-opened", state, spoken, NOW));
  const silent = () => expect(moment).toBeNull();
  const says = (_: unknown, sentence: string) => expect(moment?.text).toBe(sentence);
  const saidAgo = (_: unknown, minutes: number) => void spoken.set("needs-fixing", NOW - minutes * 60_000);
  const fresh = () => {
    settings = new MemorySettings({});
    preferences = createPreferences({ settings, secrets: new MemorySecrets() });
  };
  const reopened = () => createPreferences({ settings, secrets: new MemorySecrets() });
  const course = () => {
    fs = new MemoryFileSystem({ "course.md": "# Web\n", "topic-01/topic.md": "# Week 1\n", [PAGE]: SOURCE });
    authoring = createAuthoring({ fs, rules: courseRules, assistant: noAssistant, telemetry: new LocalTelemetry(), newId: () => "plan-1", markdown: markdownItPages });
  };
  const claudeChosen = (allowed: boolean) => async () => {
    course();
    claude = new FakeClaude("It needs a new name so Tutors can see it.");
    const secrets = new MemorySecrets();
    settings = new MemorySettings({ remoteOptIn: allowed ? [COURSE] : [] });
    preferences = createPreferences({ settings, secrets });
    await preferences.setAssistant("anthropic", "claude-opus-5-5");
    await preferences.setAssistantKey("sk-ant-good");
  };
  const asks = async (_: unknown, question: string) => {
    const fake = claude;
    const assistant =
      fake === null ? noAssistant : chosenAssistant({ preferences, course: COURSE, providers: { anthropic: (options) => anthropicAssistant({ ...options, fetch: fake.fetch }) } });
    answer = await createCompanion({ assistant }).ask(question, CONTEXT);
  };
  const fromGuide = () => expect(answer.by).toBe("guide");
  const openEditor = async () => void (opened = await authoring.openPage(PAGE));
  const saveNew = async () => void (plan = await authoring.planPage(opened, "# Layout\n\nNew words.\n"));
  const refused = (_: unknown, sentence: string) => expect(plan).toEqual({ ok: false, message: sentence });
  const onDisk = async () => decode(await fs.read(PAGE));

  Rule("When a course with errors opens, the companion shall say how many things need sorting out and offer to show them.", ({ RuleScenario }) => {
    RuleScenario("Two things to fix", ({ Given, When, Then, And }) => {
      Given("a course with {int} errors", withErrors);
      When("the course opens", opens);
      Then("the companion shall say {string}", says);
      And("the companion shall offer to go to {string}", (_, place: string) => expect(moment?.action?.goes).toBe(place));
    });
  });

  Rule("While the lecturer is typing or dragging, the companion shall stay silent.", ({ RuleScenario }) => {
    RuleScenario("Typing when a course opens", ({ Given, When, Then, And }) => {
      Given("a course with {int} errors", withErrors);
      And("the lecturer is typing", () => void (state.busy = true));
      When("the course opens", opens);
      Then("the companion shall say nothing", silent);
    });
    RuleScenario("Every trigger against every state", ({ Then }) => {
      Then("no trigger shall speak while busy or hidden, and each shall say at most one sentence with at most one place to go", () => {
        const events: CompanionEvent[] = [...new Set(moments.map((row) => row.on))];
        const flags = [false, true];
        for (const event of events)
          for (const errors of [0, 1, 3])
            for (const emptyWeek of flags)
              for (const needsPermission of flags)
                for (const busy of flags)
                  for (const hidden of flags) {
                    const found = momentFor(event, { errors, emptyWeek, needsPermission, busy, hidden }, new Map(), NOW);
                    if (busy || hidden) expect(found).toBeNull();
                    else if (found) expect(found.text.trim()).not.toBe("");
                  }
      });
    });
  });

  Rule("If the companion has said a moment in the last ten minutes, then the companion shall not say it again.", ({ RuleScenario }) => {
    RuleScenario("Opened again straight away", ({ Given, When, Then, And }) => {
      Given("a course with {int} errors", withErrors);
      And("the companion said that moment {int} minutes ago", saidAgo);
      When("the course opens", opens);
      Then("the companion shall say nothing", silent);
    });
    RuleScenario("Opened again later", ({ Given, When, Then, And }) => {
      Given("a course with {int} errors", withErrors);
      And("the companion said that moment {int} minutes ago", saidAgo);
      When("the course opens", opens);
      Then("the companion shall say {string}", says);
    });
  });

  Rule(
    "When the lecturer hides the companion, the Studio shall say no moments until the lecturer brings it back, and remember that the next time it opens.",
    ({ RuleScenario }) => {
      RuleScenario("Hidden, and still hidden after a restart", ({ Given, When, Then }) => {
        Given("a lecturer with a fresh Studio", fresh);
        When("the lecturer hides the companion", () => preferences.setCompanionHidden(true));
        Then("Studio opened again shall have the companion hidden", async () => expect(await reopened().companionHidden()).toBe(true));
      });
    },
  );

  Rule("While no assistant is chosen, the companion shall answer a question from Studio's own guide.", ({ RuleScenario }) => {
    RuleScenario("How to publish", ({ Given, When, Then, And }) => {
      Given("no assistant is chosen", () => void (claude = null));
      When("the lecturer asks {string}", asks);
      Then("the answer shall come from the guide", fromGuide);
      And("the answer shall mention {string}", (_, words: string) => expect(answer.text).toContain(words));
    });
  });

  Rule(
    "Where the lecturer has chosen an assistant and allowed it to read the course, the companion shall answer in the assistant's words, sending only the question, the screen and the checker's sentences.",
    ({ RuleScenario }) => {
      RuleScenario("Claude answers", ({ Given, When, Then, And }) => {
        Given("Claude is chosen and allowed to read the course", claudeChosen(true));
        When("the lecturer asks {string}", asks);
        Then("the answer shall be Claude's", () => expect(answer).toMatchObject({ by: "assistant", text: "It needs a new name so Tutors can see it." }));
        And("Claude shall have been sent the question, the screen and the checker's sentence", () => {
          const sent = claude!.sent();
          expect(sent).toContain("Why is week 3 missing?");
          expect(sent).toContain("Screen: Week 3");
          expect(sent).toContain("Week 3 won't be published.");
        });
        And("Claude shall not have been sent anything from the course's pages", () => expect(claude!.sent()).not.toContain(PAGE_TEXT));
      });
    },
  );

  Rule("If the assistant cannot answer, then the companion shall answer from Studio's own guide and say why.", ({ RuleScenario }) => {
    RuleScenario("Not allowed to read this course", ({ Given, When, Then, And }) => {
      Given("Claude is chosen but not allowed to read the course", claudeChosen(false));
      When("the lecturer asks {string}", asks);
      Then("the answer shall come from the guide", fromGuide);
      And("the companion shall say {string}", (_, sentence: string) => expect(answer.problem).toBe(sentence));
      And("Claude shall have been sent nothing", () => expect(claude!.requests).toHaveLength(0));
    });
  });

  Rule("The companion shall never write to a course.", ({ RuleScenario }) => {
    RuleScenario("Asking changes nothing", ({ Given, When, Then }) => {
      Given("Claude is chosen and allowed to read the course", claudeChosen(true));
      When("the lecturer asks {string}", asks);
      Then("the course shall be unchanged", async () => expect(await onDisk()).toBe(SOURCE));
    });
  });

  Rule("While Advanced mode is off, the Studio shall show no file names, Tutors environment settings, rules version or markdown editor.", ({ RuleScenario }) => {
    RuleScenario("A fresh Studio", ({ Given, Then }) => {
      Given("a lecturer with a fresh Studio", fresh);
      Then("the advanced tools shall be off", async () => expect(Object.values(workspaceFeatures(await preferences.advanced())).some(Boolean)).toBe(false));
    });
  });

  Rule("When the lecturer turns on Advanced mode, the Studio shall show those tools and keep them on the next time it opens.", ({ RuleScenario }) => {
    RuleScenario("Turned on, and still on after a restart", ({ Given, When, Then }) => {
      Given("a lecturer with a fresh Studio", fresh);
      When("the lecturer turns on Advanced mode", () => preferences.setAdvanced(true));
      Then("Studio opened again shall have the advanced tools on", async () => expect(Object.values(workspaceFeatures(await reopened().advanced())).every(Boolean)).toBe(true));
    });
  });

  Rule("When a lecturer in Advanced mode opens a page, the Studio shall show its markdown and a preview that leaves out raw HTML.", ({ RuleScenario }) => {
    RuleScenario("A page with a script in it", ({ Given, When, Then, And }) => {
      Given("a course with a page", course);
      When("the lecturer opens the page in the editor", openEditor);
      Then("the editor shall hold the page's markdown", () => expect(opened.markdown).toBe(SOURCE));
      And("the preview shall draw the heading and show the script as text", () => {
        const html = authoring.renderPage(opened.markdown);
        expect(html).toContain("<h1>Layout</h1>");
        expect(html).not.toContain("<script>");
        expect(html).toContain("&lt;script&gt;");
      });
    });
  });

  Rule("When a lecturer saves an edited page, the Studio shall offer a plan that writes only that page and write nothing until it is accepted.", ({ RuleScenario }) => {
    RuleScenario("Save, then accept", ({ Given, When, Then, And }) => {
      Given("a course with a page", course);
      When("the lecturer opens the page in the editor", openEditor);
      And("the lecturer saves it with new words", saveNew);
      Then("the plan shall write only that page", () => {
        expect(plan.ok && plan.plan.ops.map((op) => (op.op === "write" ? op.path : ""))).toEqual([PAGE]);
      });
      And("the page on disk shall be unchanged", async () => expect(await onDisk()).toBe(SOURCE));
      When("the lecturer accepts the plan", async () => {
        if (plan.ok) await authoring.apply(plan.plan);
      });
      Then("the page on disk shall have the new words", async () => expect(await onDisk()).toContain("New words."));
    });
    RuleScenario("Nothing changed", ({ Given, When, Then, And }) => {
      Given("a course with a page", course);
      When("the lecturer opens the page in the editor", openEditor);
      And("the lecturer saves it unchanged", async () => void (plan = await authoring.planPage(opened, opened.markdown)));
      Then("the Studio shall offer no plan and say {string}", refused);
    });
  });

  Rule("When a lecturer fixes a problem the rules mark safe, the Studio shall offer a plan holding that fix and write nothing until it is accepted.", ({ RuleScenario }) => {
    RuleScenario("The standard publishing file", ({ Given, When, Then, And }) => {
      let safe: ReturnType<AuthoringPort["planFix"]>;
      let target = "";
      Given("a course with no publishing file", course);
      When("the lecturer fixes that problem", async () => {
        const finding = (await authoring.refresh()).findings.find((candidate) => candidate.fix?.op === "write")!;
        target = finding.fix?.op === "write" ? finding.fix.path : "";
        safe = authoring.planFix(finding);
      });
      Then("the plan shall add that file", () => expect(safe?.ops[0]).toMatchObject({ op: "write", path: target }));
      And("the course shall not have that file yet", async () => expect((await fs.list("")).map((entry) => entry.name)).not.toContain(target));
    });
  });

  Rule("If a page changed after it was opened in the editor, then the Studio shall offer no plan and say so.", ({ RuleScenario }) => {
    RuleScenario("Changed underneath", ({ Given, When, Then, And }) => {
      Given("a course with a page", course);
      When("the lecturer opens the page in the editor", openEditor);
      And("the page changes on the computer", () =>
        authoring.apply({ id: "x", summary: "x", ops: [{ op: "write", path: PAGE, content: new TextEncoder().encode("# Someone else\n") }] }).then(() => undefined),
      );
      And("the lecturer saves it with new words", saveNew);
      Then("the Studio shall offer no plan and say {string}", refused);
    });
  });
});
