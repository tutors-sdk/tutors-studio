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
import { pageOf, plainEditor, throughPlainWriting } from "../../src/ui/plain-writing.ts";
import { codeLanguage, DIAGRAM_STARTER, MATHS_STARTER } from "../../src/domain/markdown-blocks.ts";
import type { Editor } from "@tiptap/core";

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

const SETUP_PAGE = "topic-01/lab-01/00.Setup.md";
const ICON = "---\nicon:\n  type: fluent-color:wrench-screwdriver-24\n---\n\n";
const STARTER = `${ICON}# Week 1 lab\n\n## Prerequisites\n\n- List any tools or accounts needed\n\n## Getting Started\n\nDescribe the initial setup steps here.\n`;
const STEP_1 = "topic-01/lab-01/01.Step-1.md";

const PAGES: Record<string, string> = {
  "some HTML": "# Setup\n\n<details><summary>Hint</summary>Try again.</details>\n",
  "a table with alignment": "# Setup\n\n| Tool | Version |\n| :--- | ---: |\n| Node | 22 |\n",
  "a plain table": "# Setup\n\n| Tool | Version |\n| --- | --- |\n| Node | 22 |\n",
  maths: "# Setup\n\n$$\nx_1 * y_2 = \\frac{a}{b}\n$$\n",
  "a checklist": "# Setup\n\n- [ ] Install Node\n- [x] Install VS Code\n",
  "HTML only inside code": "# Setup\n\n```html\n<p>Hello</p>\n```\n\nUse the `<p>` element.\n",
};

describeFeature(feature, ({ Rule }) => {
  let fs: MemoryFileSystem;
  let authoring: AuthoringPort;
  let opened: OpenedPage;
  let plan: Plan;
  let before: Record<string, string>;

  const course = (page: string, at = STEP, more: Record<string, string> = {}) => {
    fs = new MemoryFileSystem({ "course.md": "# Web Development\n", "topic-01/topic.md": "# Week 1\n", [at]: page, ...more });
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
          const result = await authoring.planPage(opened, pageOf(editor));
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
  const addAndPlan = async (words: string) => {
    const editor = plainEditor(opened.markdown);
    editor.commands.insertContentAt(editor.state.doc.content.size, { type: "paragraph", content: [{ type: "text", text: words }] });
    const result = await authoring.planPage(opened, pageOf(editor));
    editor.destroy();
    if (!result.ok) throw new Error(result.message);
    plan = result.plan;
  };

  Rule("Where a page starts with settings between --- lines, the Studio shall let the lecturer write the rest plainly and keep the settings as they were.", ({ RuleScenario }) => {
    RuleScenario("A lab's setup page with its icon at the top", ({ Given, When, Then, And }) => {
      Given(`a lab page "topic-01/lab-01/00.Setup.md" that starts with its icon between --- lines`, () => course(`${ICON}${SETUP}`, SETUP_PAGE));
      When("the lecturer opens the step to write", async () => {
        opened = await authoring.openPage(SETUP_PAGE);
      });
      Then("Studio shall write it plainly", () => expect(opened.plainProblem).toBeNull());
      And("writing it back unchanged shall give the same markdown", () => expect(throughPlainWriting(opened.markdown)).toBe(`${ICON}${SETUP}`));
      When("the lecturer adds a paragraph {string} and saves", (_, words: string) => addAndPlan(words));
      And("the lecturer accepts the plan", async () => expect(await authoring.apply(plan)).toEqual({ ok: true }));
      Then("the page shall still start with its icon between --- lines", () => expect(fs.snapshot()[SETUP_PAGE].startsWith(ICON)).toBe(true));
      And("the page shall end with {string}", (_, words: string) => expect(fs.snapshot()[SETUP_PAGE].trimEnd().endsWith(words)).toBe(true));
    });
  });

  Rule(
    "While a page still holds the starter text it was made with, the Studio shall mark it as not written yet, and once the lecturer's writing is saved, as written.",
    ({ RuleScenario }) => {
      RuleScenario("A week's lab, half written", ({ Given, When, Then, And }) => {
        let listed: { path: string; written: boolean }[] = [];
        const written = (path: string) => listed.find((page) => page.path === path)?.written;
        Given(`a lab whose setup page still says "Describe the initial setup steps here." and whose step 1 the lecturer has written`, () =>
          course(STARTER, SETUP_PAGE, { [STEP_1]: "# Step 1\n\nOpen VS Code and make a folder called web.\n" }),
        );
        When("the lecturer looks at the lab's pages", async () => {
          listed = await authoring.pages("topic-01/lab-01");
        });
        Then("the setup page shall be not written yet", () => expect(written(SETUP_PAGE)).toBe(false));
        And("step 1 shall be written", () => expect(written(STEP_1)).toBe(true));
        When("the lecturer writes the setup page and accepts the plan", async () => {
          const editor = plainEditor(STARTER);
          editor.commands.setContent("# Week 1 lab\n\nInstall Node 22 and VS Code.", { contentType: "markdown" });
          const result = await authoring.planPage(await authoring.openPage(SETUP_PAGE), pageOf(editor));
          editor.destroy();
          if (!result.ok) throw new Error(result.message);
          expect(await authoring.apply(result.plan)).toEqual({ ok: true });
        });
        And("the lecturer looks at the lab's pages", async () => {
          listed = await authoring.pages("topic-01/lab-01");
        });
        Then("the setup page shall be written", () => expect(written(SETUP_PAGE)).toBe(true));
      });
    },
  );

  Rule(
    "When a lecturer inserts a table, maths, a diagram or a code block while writing a page, the Studio shall add it as the markdown Tutors reads, kept as text and never drawn, that reads back the same.",
    ({ RuleScenarioOutline }) => {
      RuleScenarioOutline("Blocks from the writing toolbar", ({ Given, When, Then, And }, variables) => {
        let editor: Editor;
        let markdown = "";
        const insert: Record<string, (e: Editor) => void> = {
          "a table": (e) => e.chain().focus("end").insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run(),
          maths: (e) =>
            e
              .chain()
              .focus("end")
              .insertContent({ type: "mathBlock", content: [{ type: "text", text: MATHS_STARTER }] })
              .run(),
          "a diagram": (e) =>
            e
              .chain()
              .focus("end")
              .insertContent({ type: "codeBlock", attrs: { language: "mermaid" }, content: [{ type: "text", text: DIAGRAM_STARTER }] })
              .run(),
          "a python code block": (e) =>
            e
              .chain()
              .focus("end")
              .insertContent({ type: "codeBlock", attrs: { language: codeLanguage("Python") }, content: [{ type: "text", text: "print(1)" }] })
              .run(),
        };
        const shape: Record<string, RegExp> = {
          "a table": /\| --- \|/,
          maths: /\$\$\nE = mc\^2\n\$\$/,
          "a diagram": /```mermaid\nflowchart TD/,
          "a python code block": /```python\nprint\(1\)/,
        };
        Given("a lab page written plainly", () => {
          editor = plainEditor("# Setup\n\nDo this.\n");
        });
        When("the lecturer inserts <block>", () => {
          insert[variables.block](editor);
          markdown = pageOf(editor);
          editor.destroy();
        });
        Then("the page shall hold <block> as markdown", () => expect(markdown).toMatch(shape[variables.block]));
        And("writing the page back unchanged shall give the same markdown", () => expect(throughPlainWriting(markdown)).toBe(markdown));
      });
    },
  );
});
