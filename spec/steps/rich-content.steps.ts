import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { noAssistant } from "../../src/adapters/assistant/none/none-assistant.ts";
import { mermaidDiagrams } from "../../src/adapters/diagrams/mermaid/mermaid-diagrams.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { marpSlides } from "../../src/adapters/slides/marp/marp-slides.ts";
import { LocalTelemetry } from "../../src/adapters/telemetry/local/local-telemetry.ts";
import { runHeadless } from "../../src/adapters/cli/headless/headless.ts";
import { createAuthoring } from "../../src/application/use-cases/authoring.ts";

const feature = await loadFeature("spec/features/rich-content.feature");

const base = {
  "course.md": "# Web Development\n",
  "netlify.toml": '[build]\n  publish = "json"\n',
  "topic-01/topic.md": "# Week one\n",
};
const note = (first: string, second?: string) => ({
  ...base,
  "topic-01/note-01/note.md":
    `# How the web works\n\nA request goes out.\n\n\`\`\`mermaid\n${first}\n\`\`\`\n` + (second === undefined ? "" : `\nAnd back:\n\n\`\`\`mermaid\n${second}\n\`\`\`\n`),
});

describeFeature(feature, ({ Rule }) => {
  let fs: MemoryFileSystem;
  let lines: string[];

  const run = async (command: string, target = "") => {
    lines = [];
    const authoring = createAuthoring({
      fs,
      rules: courseRules,
      assistant: noAssistant,
      telemetry: new LocalTelemetry(),
      newId: () => "plan-1",
      diagrams: mermaidDiagrams,
      slides: marpSlides,
    });
    await runHeadless(authoring, command, (line) => lines.push(line), target);
  };
  const checks = () => run("check");
  const previews = (_: unknown, folder: string) => run("preview", folder);
  const printed = (_: unknown, line: string) => expect(lines).toContain(line);
  const printedFor = (_: unknown, path: string, text: string) => expect(lines.filter((line) => line.includes(`${path}:`)).join("\n")).toContain(text);

  Rule(
    "When a lecturer opens a course, the Studio shall check every Mermaid diagram with the Mermaid the reader draws with and list each one that won't draw.",
    ({ RuleScenario }) => {
      RuleScenario("An unclosed bracket in a page's flowchart", ({ Given, When, Then }) => {
        Given("a course whose note draws a flowchart with an unclosed bracket on its third line", () => {
          fs = new MemoryFileSystem(note("flowchart LR\n  Browser --> Server\n  Server[Web server --> Browser"));
        });
        When("the lecturer checks the course", checks);
        Then("the command shall print a finding for {string} that says {string}", printedFor);
      });
      RuleScenario("The same flowchart closed", ({ Given, When, Then }) => {
        Given("a course whose note draws a flowchart that is complete", () => {
          fs = new MemoryFileSystem(note("flowchart LR\n  Browser --> Server\n  Server[Web server] --> Browser"));
        });
        When("the lecturer checks the course", checks);
        Then("the command shall print {string}", printed);
      });
    },
  );

  Rule("When a lecturer selects a Talk that holds a Marp deck, the Studio shall show the deck's slides as Marp renders them for the reader.", ({ RuleScenario }) => {
    RuleScenario("A two-slide deck on the gaia theme", ({ Given, When, Then }) => {
      Given("a course whose talk holds a two-slide Marp deck on the gaia theme", () => {
        fs = new MemoryFileSystem({
          ...base,
          "topic-01/talk-01/talk.md": "# Introducing HTML\n",
          "topic-01/talk-01/talk.marp": "---\nmarp: true\ntheme: gaia\n---\n\n# Introducing HTML\n\n---\n\n## Tags\n",
        });
      });
      When("the lecturer previews {string}", previews);
      Then("the command shall print {string}", printed);
    });
  });

  Rule("When a lecturer selects a folder whose pages hold Mermaid diagrams, the Studio shall show each diagram with the line of the page it starts on.", ({ RuleScenario }) => {
    RuleScenario("A note with two diagrams", ({ Given, When, Then }) => {
      Given("a course whose note holds two diagrams", () => {
        fs = new MemoryFileSystem(note("flowchart LR\n  A --> B", "sequenceDiagram\n  Browser->>Server: GET /"));
      });
      When("the lecturer previews {string}", previews);
      Then("the command shall print a line for {string} that says {string}", printedFor);
    });
  });

  Rule("When a lecturer opens a course with a quiz question the reader leaves out, the Studio shall name the question and say why it is left out.", ({ RuleScenario }) => {
    RuleScenario("A question with no right answer", ({ Given, When, Then }) => {
      Given("a course whose quiz has a second question with no right answer", () => {
        fs = new MemoryFileSystem({
          ...base,
          "topic-01/quiz-01/quiz.md":
            "# Week one quiz\n\n```quiz\nquestion: Which keyword declares a constant?\noptions:\n  - var\n  - const\ncorrect: 1\n---\nquestion: Which tag makes a link?\noptions:\n  - <a>\n  - <link>\n```\n",
        });
      });
      When("the lecturer checks the course", checks);
      Then("the command shall print a finding for {string} that says {string}", printedFor);
    });
  });
});
