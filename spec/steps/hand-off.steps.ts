import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { noAssistant } from "../../src/adapters/assistant/none/none-assistant.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "../../src/adapters/telemetry/local/local-telemetry.ts";
import { gitPublish } from "../../src/adapters/publish/git/git-publish.ts";
import { runHandOff, runHeadless } from "../../src/adapters/cli/headless/headless.ts";
import { createAuthoring } from "../../src/application/use-cases/authoring.ts";
import { createHandOff } from "../../src/application/use-cases/hand-off.ts";
import type { AuthoringPort } from "../../src/application/ports/authoring.ts";
import type { HandOffPort } from "../../src/application/ports/hand-off.ts";
import type { Plan } from "../../src/domain/plan.ts";
import { FakeGit, type FakeGitOptions } from "../../tests/support/fake-git.ts";

const feature = await loadFeature("spec/features/hand-off.feature");
const ROOT = "/home/lecturer/web-dev";

const clean = (extra: Record<string, string> = {}) =>
  new MemoryFileSystem({
    "course.md": "# Web Development\n",
    "netlify.toml": '[build]\n  publish = "json"\n',
    ".gitignore": "node_modules/\njson/\n",
    "topic-01/topic.md": "# Week 1\n",
    "topic-01/talk-01/talk.md": "# Intro\n",
    "topic-01/talk-01/slides.pdf": "%PDF",
    ...extra,
  });

describeFeature(feature, ({ Rule }) => {
  let fs: MemoryFileSystem;
  let git: FakeGit;
  let authoring: AuthoringPort;
  let handOff: HandOffPort;
  let before: Record<string, string>;
  let plan: Plan | null;
  let lines: string[];

  const given = (course: MemoryFileSystem, options: FakeGitOptions = {}) => {
    fs = course;
    before = fs.snapshot();
    git = new FakeGit(options);
    let n = 0;
    const newId = () => `plan-${++n}`;
    const telemetry = new LocalTelemetry();
    authoring = createAuthoring({ fs, rules: courseRules, assistant: noAssistant, telemetry, newId });
    handOff = createHandOff({ fs, rules: courseRules, git: gitPublish(git, ROOT), telemetry, newId });
  };
  const pushes = async (_: unknown, message: string) => {
    lines = [];
    await runHandOff(handOff, authoring, "push", (line) => lines.push(line), message);
  };
  const prints = (_: unknown, line: string) => expect(lines).toContain(line);
  const printsSaying = (_: unknown, part: string) => expect(lines.some((line) => line.includes(part))).toBe(true);
  const holds = (_: unknown, path: string) => expect(Object.keys(fs.snapshot())).toContain(path);
  const gitChangedNothing = () => expect(git.writes).toEqual([]);
  const text = (path: string) => fs.snapshot()[path];

  Rule(
    "When a lecturer asks to fix everything safe, the Studio shall offer one plan holding every fix the rules mark safe, with the deepest files and folders renamed first.",
    ({ RuleScenario }) => {
      RuleScenario("A file inside a folder that is also renamed", ({ Given, When, Then, And }) => {
        Given("a course with a folder named {string} and a talk {string} holding {string}", (_: unknown, week: string, talk: string, file: string) => {
          given(
            new MemoryFileSystem({
              "course.md": "# Web Development\n",
              "topic-01/topic.md": "# Week 1\n",
              [`${talk}/talk.md`]: "# Intro\n",
              [`${talk}/${file}`]: "%PDF",
              [`${week}/topic.md`]: `# ${week}\n`,
            }),
          );
        });
        When("the lecturer asks to fix everything safe", async () => {
          plan = await authoring.planFixAll();
        });
        Then("the plan shall rename {string} before {string}", (_: unknown, first: string, second: string) => {
          const froms = plan!.ops.map((op) => (op.op === "move" ? op.from : op.path));
          expect(froms.indexOf(first)).toBeGreaterThanOrEqual(0);
          expect(froms.indexOf(first)).toBeLessThan(froms.indexOf(second));
        });
        And("the course shall be unchanged", () => expect(fs.snapshot()).toEqual(before));
        When("the lecturer fixes the course from the command line", async () => {
          lines = [];
          await runHeadless(authoring, "fix", (line) => lines.push(line));
        });
        Then("the command shall print {string}", prints);
        And("the course shall hold {string}", holds);
        And("the course shall also hold {string}", holds);
      });
    },
  );

  Rule(
    "When a lecturer commits and pushes a course with no errors, the Studio shall add every change, commit it with the lecturer's message, and push the branch with the computer's git.",
    ({ RuleScenario }) => {
      RuleScenario("One changed page goes to GitHub", ({ Given, When, Then, And }) => {
        Given("a course with no errors in a git repository with one changed file", () => given(clean()));
        When("the lecturer pushes with the message {string}", pushes);
        Then("the command shall print {string}", prints);
        And("git shall have run {string}, then {string}, then {string}", (_: unknown, ...calls: string[]) => {
          expect(git.writes).toEqual(calls.map((call) => `git ${call}`));
        });
      });
    },
  );

  Rule("If the course's .gitignore does not leave out the generated json folder, then the Studio shall commit nothing and offer the plan that adds it.", ({ RuleScenario }) => {
    RuleScenario("The build folder would have been committed", ({ Given, When, Then, And }) => {
      Given("a course with no errors whose .gitignore does not mention json, in a git repository", () => given(clean({ ".gitignore": "node_modules/" })));
      When("the lecturer pushes with the message {string}", pushes);
      Then("the command shall print a line saying {string}", printsSaying);
      And("git shall have changed nothing", gitChangedNothing);
      When("the lecturer accepts the plan that leaves json out of git", async () => {
        expect(await runHandOff(handOff, authoring, "ignore-build", () => {})).toBe(0);
      });
      Then("the course's .gitignore shall keep its own lines and end with {string}", (_: unknown, last: string) => {
        expect(text(".gitignore").startsWith("node_modules/\n")).toBe(true);
        expect(text(".gitignore").trimEnd().endsWith(last)).toBe(true);
      });
      And("a push with the message {string} shall now succeed", async (_: unknown, message: string) => {
        expect(await runHandOff(handOff, authoring, "push", () => {}, message)).toBe(0);
        expect(git.writes.at(-1)).toBe("git push -u origin HEAD");
      });
    });
  });

  Rule("If a course has errors, then the Studio shall commit nothing and say how many to fix.", ({ RuleScenario }) => {
    RuleScenario("Week 3 would be missing", ({ Given, When, Then, And }) => {
      Given("a course with a folder named {string} in a git repository", (_: unknown, week: string) => given(clean({ [`${week}/topic.md`]: `# ${week}\n` })));
      When("the lecturer pushes with the message {string}", pushes);
      Then("the command shall print {string}", prints);
      And("git shall have changed nothing", gitChangedNothing);
    });
  });

  Rule("While the course folder is not a git repository, the Studio shall commit nothing and say how to publish instead.", ({ RuleScenario }) => {
    RuleScenario("A course kept only on this computer", ({ Given, When, Then, And }) => {
      Given("a course with no errors in a folder that is not a git repository", () => given(clean(), { repository: false }));
      When("the lecturer pushes with the message {string}", pushes);
      Then("the command shall print a line saying {string}", printsSaying);
      And("git shall have changed nothing", gitChangedNothing);
    });
  });
});
