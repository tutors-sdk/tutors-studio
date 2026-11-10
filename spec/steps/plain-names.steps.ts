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
import type { Finding } from "../../src/domain/finding.ts";

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
  const ownFolders = () => {
    fs = new MemoryFileSystem({
      "course.md": "# Web Development\n",
      "netlify.toml": '[build]\n  publish = "json"\n',
      "topic-01/topic.md": "# Week 1\n",
      "topic-01/lab-01/01.Setup.md": "# Setup\n\nInstall the tools.\n",
      "topic-01/Intro slides/intro.pdf": "%PDF-1.4\n",
      "topic-01/Grid practical/setup.md": "# Setup\n\nOpen the starter.\n",
      "topic-01/Grid practical/the grid.md": "# The grid\n\nTwo columns.\n",
      "Week 2/overview.md": "# Week 2\n\nLayout.\n",
      "Week 3/topic.md": "# Week 3: Grid\n",
      "Week 3/talk-01/talk.md": "# Grid\n",
      "Week 3/talk-01/slides.pdf": "%PDF",
    });
    before = fs.snapshot();
    authoring = createAuthoring({ fs, rules: courseRules, assistant: noAssistant, telemetry: new LocalTelemetry(), newId: () => "plan-1" });
  };
  const make = async (folder: string, word: string) => {
    proposal = await authoring.planVisible(folder, word);
  };
  const opsOf = () => (proposal.ok ? proposal.plan.ops : []);
  const moves = (_: unknown, from: string, to: string) => {
    expect(proposal.ok).toBe(true);
    expect(opsOf()).toContainEqual({ op: "move", from, to });
  };
  const writes = (_: unknown, path: string) =>
    expect(
      opsOf()
        .filter((op) => op.op === "write")
        .map((op) => (op.op === "write" ? op.path : "")),
    ).toContain(path);
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

  Rule(
    "When a lecturer makes a folder students can't see into a lecture, lab, reading or week by its plain name, the Studio shall propose a plan that renames the folder to the kind Tutors reads, keeps everything inside it, and adds only the files that kind still needs.",
    ({ RuleScenario }) => {
      RuleScenario("A folder of slides made into a lecture", ({ Given, When, Then, And }) => {
        Given(`a course whose topic-01 holds lab-01 and the lecturer's own folders "Intro slides" and "Grid practical"`, ownFolders);
        When("the lecturer makes {string} a {string}", (_, folder: string, word: string) => make(folder, word));
        Then("the plan shall move {string} to {string}", moves);
        And("the plan shall write {string}", writes);
        And("the plan shall write nothing else", () => expect(opsOf().filter((op) => op.op === "write")).toHaveLength(1));
        And("nothing shall have been written to the course", () => expect(fs.snapshot()).toEqual(before));
        When("the lecturer accepts the plan", accept);
        Then("{string} shall show as a {string} titled {string}", shows);
        And("{string} shall still be there", async (_, path: string) => expect(await fs.exists(path)).toBe(true));
      });
      RuleScenario("A loose folder made into a week", ({ Given, When, Then }) => {
        Given(`a course whose topic-01 holds lab-01 and the lecturer's own folders "Intro slides" and "Grid practical"`, ownFolders);
        When("the lecturer makes {string} a {string}", (_, folder: string, word: string) => make(folder, word));
        Then("the plan shall move {string} to {string}", moves);
        When("the lecturer accepts the plan", accept);
        Then("{string} shall show as a {string} titled {string}", shows);
      });
    },
  );

  Rule(
    "When a lecturer makes a folder of pages into a lab, the Studio shall propose numbering its unnumbered pages as steps, in name order, after any steps it already has.",
    ({ RuleScenario }) => {
      RuleScenario("A practical's pages become steps", ({ Given, When, Then, And }) => {
        Given(`a course whose topic-01 holds lab-01 and the lecturer's own folders "Intro slides" and "Grid practical"`, ownFolders);
        When("the lecturer makes {string} a {string}", (_, folder: string, word: string) => make(folder, word));
        Then("the plan shall move {string} to {string}", moves);
        And("the plan shall also move {string} to {string}", moves);
        When("the lecturer accepts the plan", accept);
        Then("{string} shall show as a {string} titled {string}", shows);
        And("{string} shall have no errors", async (_, path: string) =>
          expect((await authoring.refresh()).findings.filter((f) => f.severity === "error" && (f.path === path || f.path.startsWith(`${path}/`)))).toEqual([]),
        );
      });
    },
  );

  Rule("If the lecturer's word can't make the folder something students see where it sits, then the Studio shall say which words can and propose no plan.", ({ RuleScenario }) => {
    RuleScenario("Words that don't fit the folder", ({ Given, When, Then, And }) => {
      Given(`a course whose topic-01 holds lab-01 and the lecturer's own folders "Intro slides" and "Grid practical"`, ownFolders);
      When("the lecturer makes {string} a {string}", (_, folder: string, word: string) => make(folder, word));
      Then("Studio shall say {string}", says);
      When("the lecturer then makes {string} a {string}", (_, folder: string, word: string) => make(folder, word));
      Then("Studio shall also say {string}", says);
      When("the lecturer finally makes {string} a {string}", (_, folder: string, word: string) => make(folder, word));
      Then("Studio shall still say {string}", says);
      And("nothing shall have been written to the course", () => expect(fs.snapshot()).toEqual(before));
    });
  });

  Rule(
    "While a folder Tutors leaves out has a name that declares no kind, the Studio shall leave the lecturer to choose what it is, and offer no rename that picks the kind for them, alone or among the safe fixes.",
    ({ RuleScenario }) => {
      RuleScenario("Week 3 waits for the lecturer to say what it is", ({ Given, When, Then, And }) => {
        let found: Finding;
        Given(`a course whose topic-01 holds lab-01 and the lecturer's own folders "Intro slides" and "Grid practical"`, ownFolders);
        When("the lecturer looks at what Studio would fix in {string}", async (_, folder: string) => {
          found = (await authoring.refresh()).findings.find((f) => f.path === folder && f.rule === "V002")!;
          expect(found).toBeDefined();
        });
        Then("Studio shall offer no rename for {string}", () => {
          expect(found.suggestedName).toBeUndefined();
          expect(found.fix).toBeUndefined();
          expect(authoring.planFix(found)).toBeNull();
        });
        And("the safe fixes shall leave {string} where it is", async (_, folder: string) => {
          const all = await authoring.planFixAll();
          expect((all?.ops ?? []).filter((op) => op.op === "move" && op.from === folder)).toEqual([]);
        });
        When("the lecturer makes {string} a {string}", (_, folder: string, word: string) => make(folder, word));
        Then("the plan shall move {string} to {string}", moves);
      });
    },
  );

  Rule("The Studio shall offer a video link to add to a week and a section to add at the top of the course, by those names.", ({ RuleScenario }) => {
    RuleScenario("A video link added to Week 1", ({ Given, When, Then, And }) => {
      Given('a course whose topic-01 is titled "Week 1" and already holds lab-01', weekOne);
      When("the lecturer adds a {string} called {string} at {string} to {string}", (_, word: string, title: string, address: string, folder: string) =>
        add(word, title, folder, address),
      );
      Then("the plan shall make {string} with {string}", makes);
      And("the video's id shall be {string}", (_, id: string) => {
        const op = opsOf().find((candidate) => candidate.op === "write" && candidate.path.endsWith("/videoid"));
        expect(op?.op === "write" ? new TextDecoder().decode(op.content) : "").toBe(`${id}\n`);
      });
      When("the lecturer accepts the plan", accept);
      Then("the course shall have no errors", noErrors);
    });
    RuleScenario("A section added to the course", ({ Given, When, Then }) => {
      Given('a course whose topic-01 is titled "Week 1" and already holds lab-01', weekOne);
      When("the lecturer adds a {string} called {string} to the course", (_, word: string, title: string) => add(word, title, ""));
      Then("the plan shall make {string} with {string}", makes);
      When("the lecturer accepts the plan", accept);
      Then("{string} shall show as a {string} titled {string}", shows);
    });
    RuleScenario("A section inside a week", ({ Given, When, Then }) => {
      Given('a course whose topic-01 is titled "Week 1" and already holds lab-01', weekOne);
      When("the lecturer adds a {string} called {string} to {string}", (_, word: string, title: string, folder: string) => add(word, title, folder));
      Then("Studio shall say {string}", says);
    });
  });
});
