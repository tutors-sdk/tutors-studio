// @vitest-environment jsdom
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { noAssistant } from "../../src/adapters/assistant/none/none-assistant.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "../../src/adapters/telemetry/local/local-telemetry.ts";
import { createAuthoring } from "../../src/application/use-cases/authoring.ts";
import type { AuthoringPort, OpenedPage } from "../../src/application/ports/authoring.ts";
import type { Plan } from "../../src/domain/plan.ts";
import { plainEditor, throughPlainWriting } from "../../src/ui/plain-writing.ts";

const feature = await loadFeature("spec/features/writing.feature");

const STEP = "topic-01/lab-01/01.Setup.md";
const SETUP = `# Setup

Install **Node** and *VS Code*, then read [the Node docs](https://nodejs.org).

- Download the installer
- Run it

![The installer](img/installer.png)

\`\`\`bash
node --version
\`\`\``;

const PAGES: Record<string, string> = {
  "settings at the top": "---\ntitle: Setup\n---\n\n# Setup\n",
  "some HTML": "# Setup\n\n<details><summary>Hint</summary>Try again.</details>\n",
  "a table": "# Setup\n\n| Tool | Version |\n| --- | --- |\n| Node | 22 |\n",
  "a checklist": "# Setup\n\n- [ ] Install Node\n- [x] Install VS Code\n",
  "HTML only inside code": "# Setup\n\n```html\n<p>Hello</p>\n```\n\nUse the `<p>` element.\n",
};

describeFeature(feature, ({ Rule }) => {
  let fs: MemoryFileSystem;
  let authoring: AuthoringPort;
  let opened: OpenedPage;
  let plan: Plan;
  let before: Record<string, string>;

  const course = (page: string) => {
    fs = new MemoryFileSystem({ "course.md": "# Web Development\n", "topic-01/topic.md": "# Week 1\n", [STEP]: page });
    before = fs.snapshot();
    authoring = createAuthoring({ fs, rules: courseRules, assistant: noAssistant, telemetry: new LocalTelemetry(), newId: () => "plan-1" });
  };

  Rule(
    "When a lecturer writes a page in plain language, the Studio shall keep it as markdown that reads back the same, and save it only through a plan the lecturer accepts.",
    ({ RuleScenario }) => {
      RuleScenario("A lab step written plainly", ({ Given, When, Then, And }) => {
        Given(`a course whose lab step "topic-01/lab-01/01.Setup.md" has a heading, bold, a list, a link, a picture and code`, () => course(SETUP));
        When("the lecturer opens the step to write", async () => {
          opened = await authoring.openPage(STEP);
        });
        Then("Studio shall write it plainly", () => expect(opened.plainProblem).toBeNull());
        And("writing it back unchanged shall give the same markdown", () => expect(throughPlainWriting(opened.markdown)).toBe(SETUP));
        When("the lecturer adds a paragraph {string} and saves", async (_, words: string) => {
          const editor = plainEditor(opened.markdown);
          editor.commands.insertContentAt(editor.state.doc.content.size, { type: "paragraph", content: [{ type: "text", text: words }] });
          const result = await authoring.planPage(opened, editor.getMarkdown());
          editor.destroy();
          if (!result.ok) throw new Error(result.message);
          plan = result.plan;
        });
        Then("nothing shall have been written to the course", () => expect(fs.snapshot()).toEqual(before));
        When("the lecturer accepts the plan", async () => expect(await authoring.apply(plan)).toEqual({ ok: true }));
        Then("the step shall end with {string}", (_, words: string) => expect(fs.snapshot()[STEP].trimEnd().endsWith(words)).toBe(true));
      });
    },
  );

  Rule("If a page holds something plain writing can't keep, then the Studio shall say what it is and leave the page to the markdown editor.", ({ RuleScenarioOutline }) => {
    RuleScenarioOutline("Pages plain writing can't keep", ({ Given, When, Then }, variables) => {
      Given("a page that holds <what>", () => course(PAGES[variables.what]));
      When("the lecturer opens it to write", async () => {
        opened = await authoring.openPage(STEP);
      });
      Then('Studio shall say the page has "<named>"', () => {
        if (variables.named === "nothing") expect(opened.plainProblem).toBeNull();
        else expect(opened.plainProblem).toContain(`has ${variables.named},`);
      });
    });
  });
});
