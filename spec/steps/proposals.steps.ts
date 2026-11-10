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
import type { ArrangePlan, AuthoringPort } from "../../src/application/ports/authoring.ts";
import type { PreferencesPort } from "../../src/application/ports/preferences.ts";
import { flatten } from "../../src/domain/course-map.ts";
import { FakeClaude } from "../../tests/support/fake-claude.ts";

const feature = await loadFeature("spec/features/proposals.feature");
const COURSE = "/home/lecturer/web-dev";
const LAB = "topic-01/lab-01-grid";
const WEEK = "topic-01";
const NOTES = "Grid notes: make a container with display grid, then place the boxes with grid-column.";
const DRAFT = "# Make the grid\n\nGive the container `display: grid`.\n\n# Place the boxes\n\nUse `grid-column` on each box.\n";
const INTRO_PAGE = "Welcome to the module and how the labs run.";
const LAYOUT_PAGE = "Flexbox lays out a row of boxes; grid lays out rows and columns.";
const LATER_STEP = "Only the first step's start is sent.";
const ORDER = JSON.stringify({
  items: [
    { name: "talk-02-flexbox-and-grid", title: "Layout with flexbox", why: "Students meet flexbox before they need it in the lab." },
    { name: "talk-01-intro", title: "Getting started", why: "Says what the week is for." },
    { name: "lab-01-grid", title: "Grid", why: "Already clear." },
  ],
});

describeFeature(feature, ({ Rule }) => {
  let fs: MemoryFileSystem;
  let preferences: PreferencesPort;
  let claude: FakeClaude;
  let authoring: AuthoringPort;
  let proposal: ArrangePlan;
  let before: Record<string, string>;

  const course = (files: Record<string, string>) => {
    fs = new MemoryFileSystem({ "course.md": "# Web Development\n", "netlify.toml": '[build]\n  publish = "json"\n', "topic-01/topic.md": "# Week 1\n", ...files });
    before = fs.snapshot();
    preferences = createPreferences({ settings: new MemorySettings({ remoteOptIn: [COURSE] }), secrets: new MemorySecrets() });
    claude = new FakeClaude();
  };
  const withLab = () => course({ [`${LAB}/01.Setup.md`]: "# Setup\n\nOpen the starter.\n" });
  const chooseClaude = (answer: string) => async () => {
    claude = new FakeClaude(answer);
    await preferences.setAssistant("anthropic", "claude-opus-5-5");
    await preferences.setAssistantKey("sk-ant-good");
  };
  const studio = () => {
    const assistant = chosenAssistant({ preferences, course: COURSE, providers: { anthropic: (options) => anthropicAssistant({ ...options, fetch: claude.fetch }) } });
    authoring = createAuthoring({ fs, rules: courseRules, assistant, telemetry: new LocalTelemetry(), newId: () => "plan-1" });
    return authoring;
  };
  const draft = async () => {
    proposal = await studio().planLabDraft(LAB, NOTES);
  };
  const accept = async () => {
    if (!proposal.ok) throw new Error(proposal.message);
    expect(await authoring.apply(proposal.plan)).toEqual({ ok: true });
  };
  const nothingWritten = () => expect(fs.snapshot()).toEqual(before);
  const sent = () => claude.requests[0].body.messages[0].content;

  Rule(
    "When a lecturer asks the chosen assistant to draft a lab from their notes, the Studio shall send it only those notes and propose a plan that adds the steps it drafts after the lab's own, writing nothing until the plan is accepted.",
    ({ RuleScenario }) => {
      RuleScenario("A grid lab drafted from notes", ({ Given, When, Then, And }) => {
        Given('a course whose lab "Grid" already has the step "01.Setup.md"', withLab);
        And('the lecturer has chosen Claude, which drafts the steps "Make the grid" and "Place the boxes"', chooseClaude(DRAFT));
        When("the lecturer asks Claude to draft the lab from their notes", draft);
        Then("Claude shall have been sent the notes and nothing else from the course", () => {
          expect(claude.requests).toHaveLength(1);
          expect(sent()).toBe(NOTES);
        });
        And("the plan shall add {string} and {string}", (_, first: string, second: string) => {
          expect(proposal.ok).toBe(true);
          if (proposal.ok) expect(proposal.plan.ops.map((op) => (op.op === "write" ? op.path : op.to))).toEqual([`${LAB}/${first}`, `${LAB}/${second}`]);
        });
        And("nothing shall have been written to the course", nothingWritten);
        When("the lecturer accepts the plan", accept);
        Then("the lab shall have {int} steps", async (_, count: number) => expect(await authoring.labSteps(LAB)).toHaveLength(count));
      });
    },
  );

  Rule(
    "When a lecturer asks the chosen assistant to suggest titles and an order for a week, the Studio shall send it only the week's titles and the start of each page, and propose one plan that retitles and reorders the week as suggested.",
    ({ RuleScenario }) => {
      RuleScenario("Week 1 retitled and reordered", ({ Given, When, Then, And }) => {
        Given('a course whose week "Week 1" holds the talks "Intro" and "Flexbox and Grid" and a lab "Grid"', () =>
          course({
            "topic-01/talk-01-intro/talk.md": `# Intro\n\n${INTRO_PAGE}\n`,
            "topic-01/talk-01-intro/intro.pdf": "%PDF-1.4\n",
            "topic-01/talk-02-flexbox-and-grid/layout.pdf": "%PDF-1.4\n",
            "topic-01/talk-02-flexbox-and-grid/talk.md": `# Flexbox and Grid\n\n${LAYOUT_PAGE}\n`,
            [`${LAB}/01.Setup.md`]: "# Grid\n\nOpen the starter.\n",
            [`${LAB}/02.Boxes.md`]: `# Boxes\n\n${LATER_STEP}\n`,
          }),
        );
        And('the lecturer has chosen Claude, which suggests "Layout with flexbox" first and "Getting started" second', chooseClaude(ORDER));
        When("the lecturer asks Claude to suggest titles and an order for the week", async () => {
          proposal = await studio().planWeekSuggestion(WEEK);
        });
        Then("Claude shall have been sent each item's title and the start of its page", () => {
          expect(claude.requests).toHaveLength(1);
          for (const words of ["Week 1", "Intro", "Flexbox and Grid", INTRO_PAGE, LAYOUT_PAGE, "Open the starter."]) expect(sent()).toContain(words);
          expect(sent()).not.toContain(LATER_STEP);
        });
        And("nothing shall have been written to the course", nothingWritten);
        When("the lecturer accepts the plan", accept);
        Then("the week's talks shall read {string} then {string}", async (_, first: string, second: string) => {
          const week = flatten((await authoring.refresh()).map).find((node) => node.path === WEEK)!;
          expect(week.children.filter((child) => child.kind === "talk").map((child) => child.title)).toEqual([first, second]);
        });
        And("the course shall have no errors", async () => expect((await authoring.refresh()).findings.filter((f) => f.severity === "error")).toEqual([]));
      });
    },
  );

  Rule("If no assistant is chosen, or its answer can't be read as steps or a list, then the Studio shall say so and propose no plan.", ({ RuleScenarioOutline }) => {
    RuleScenarioOutline("Nothing Studio can use", ({ Given, When, Then, And }, variables) => {
      Given('a course whose lab "Grid" already has the step "01.Setup.md"', withLab);
      And("<assistant>", async () => {
        if (variables.assistant !== "no assistant is chosen") await chooseClaude("I'd start with a grid and then place the boxes.")();
      });
      When("the lecturer asks for a draft of the lab from their notes", draft);
      Then('Studio shall say "<words>"', () => {
        expect(proposal.ok).toBe(false);
        if (!proposal.ok) expect(proposal.message).toContain(variables.words);
      });
      And("there shall be no plan", nothingWritten);
    });
  });
});
