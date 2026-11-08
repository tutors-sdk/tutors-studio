import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { validate } from "@tutors/course-rules";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { noAssistant } from "../../src/adapters/assistant/none/none-assistant.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "../../src/adapters/telemetry/local/local-telemetry.ts";
import { runHeadless } from "../../src/adapters/cli/headless/headless.ts";
import { createAuthoring } from "../../src/application/use-cases/authoring.ts";
import type { AssistantPort } from "../../src/application/ports/assistant.ts";
import type { ApplyResult, AuthoringPort, CourseView } from "../../src/application/ports/authoring.ts";
import { flatten } from "../../src/domain/course-map.ts";
import type { Plan } from "../../src/domain/plan.ts";

const feature = await loadFeature("spec/features/authoring.feature");

const course = () =>
  new MemoryFileSystem({
    "course.md": "# Web Development\n",
    "topic-01/topic.md": "# Week 1\n",
    "topic-01/talk-01/talk.md": "# Intro\n",
    "topic-01/talk-01/slides.pdf": "%PDF",
    "Week 3/topic.md": "# Week 3\n",
    "Week 3/talk-01/talk.md": "# Layout\n",
    "Week 3/talk-01/slides.pdf": "%PDF",
  });

describeFeature(feature, ({ Rule, BeforeEachScenario }) => {
  let fs: MemoryFileSystem;
  let assistant: AssistantPort;
  let authoring: AuthoringPort;
  let view: CourseView;
  let plan: Plan | null;
  let before: Record<string, string>;
  let result: ApplyResult;
  let explanation: string;
  let lines: string[];
  let exitCode: number;

  const build = () => {
    let n = 0;
    authoring = createAuthoring({ fs, rules: courseRules, assistant, telemetry: new LocalTelemetry(), newId: () => `plan-${++n}` });
  };
  BeforeEachScenario(() => {
    assistant = noAssistant;
  });

  const givenCourse = () => {
    fs = course();
    before = fs.snapshot();
    build();
  };
  const opens = async () => {
    view = await authoring.refresh();
  };
  const findingAt = async (path: string) => (await authoring.refresh()).findings.find((f) => f.path === path)!;
  const unchanged = () => expect(fs.snapshot()).toEqual(before);
  const holds = (_: unknown, path: string) => expect(Object.keys(fs.snapshot())).toContain(path);
  const showsAs = (_: unknown, path: string, label: string) => expect(flatten(view.map).find((n) => n.path === path)?.label).toBe(label);
  const applyTwoStep = async (_: unknown, folder: string, file: string) => {
    result = await authoring.apply({
      id: "p",
      summary: "two steps",
      ops: [
        { op: "move", from: folder, to: "topic-week-3" },
        { op: "write", path: file, content: new TextEncoder().encode("x") },
      ],
    });
  };
  const blocker = (_: unknown, path: string) => expect(result).toMatchObject({ ok: false, blockedBy: path });
  const explain = async (_: unknown, path: string) => {
    explanation = await authoring.explain(await findingAt(path));
  };

  Rule("The Studio shall change a course only by applying a plan the lecturer has accepted.", ({ RuleScenario }) => {
    RuleScenario("Asking for a fix changes nothing until the plan is applied", ({ Given, When, Then, And }) => {
      Given("a course with a folder named {string}", givenCourse);
      When("the lecturer asks for the fix to {string}", async (_, path: string) => {
        plan = authoring.planFix(await findingAt(path));
      });
      Then("the plan shall read {string}", (_, summary: string) => expect(plan?.summary).toBe(summary));
      And("the course shall be unchanged", unchanged);
      When("the lecturer accepts the plan", async () => {
        result = await authoring.apply(plan!);
      });
      Then("the course shall hold {string}", holds);
    });
  });

  Rule(
    "When a lecturer opens a course folder, the Studio shall show every folder with the kind Tutors reads it as, and mark each folder Tutors would leave out as won't be published.",
    ({ RuleScenario }) => {
      RuleScenario("A course with a week Tutors would drop", ({ Given, When, Then, And }) => {
        Given("a course with a folder named {string}", givenCourse);
        When("the lecturer opens the course", opens);
        Then("the map shall show {string} as {string}", showsAs);
        And("the map shall show {string} as {string}", showsAs);
        And("the map shall mark {string} as won't be published", (_, path: string) => {
          const node = flatten(view.map).find((n) => n.path === path)!;
          expect(node.unpublished).toBe(true);
          expect(node.label).toBeNull();
        });
      });
    },
  );

  Rule(
    "When a lecturer accepts the rename a finding suggests, the Studio shall move the folder with everything in it and show the course checked again without that finding.",
    ({ RuleScenario }) => {
      RuleScenario("Renaming Week 3 clears its badge", ({ Given, When, Then, And }) => {
        Given("a course with a folder named {string}", givenCourse);
        When("the lecturer opens the course", opens);
        And("the lecturer accepts the fix to {string}", async (_, path: string) => {
          const fix = authoring.planFix(view.findings.find((f) => f.path === path)!)!;
          expect((await authoring.apply(fix)).ok).toBe(true);
          view = await authoring.refresh();
        });
        Then("the course shall hold {string}", holds);
        And("the map shall show {string} as {string}", showsAs);
        And("there shall be no errors", () => expect(view.findings.filter((f) => f.severity === "error")).toEqual([]));
      });
    },
  );

  Rule("If applying a plan fails part-way, then the Studio shall undo every change the plan made and name the file that blocked it.", ({ RuleScenario }) => {
    RuleScenario("A locked file stops a two-step plan", ({ Given, When, Then, And }) => {
      Given("a course with a folder named {string}", givenCourse);
      And("the file {string} cannot be written", (_, path: string) => {
        fs.failOn.add(path);
      });
      When("the lecturer applies a plan that renames {string} and then writes {string}", applyTwoStep);
      Then("the result shall name {string} as the blocker", blocker);
      And("the course shall be unchanged", unchanged);
    });
  });

  Rule("While no assistant is chosen, the Studio shall explain a finding with the rule's own message.", ({ RuleScenario }) => {
    RuleScenario("No assistant, so the rule explains itself", ({ Given, When, Then, And }) => {
      Given("a course with a folder named {string}", givenCourse);
      And("no assistant is chosen", () => {
        assistant = noAssistant;
        build();
      });
      When("the lecturer asks for an explanation of {string}", explain);
      Then("the explanation shall be the rule's own message", async () => {
        const own = (await validate(fs)).find((f) => f.path === "Week 3")!.message;
        expect(explanation).toBe(own);
      });
    });
    RuleScenario("A chosen assistant explains in its own words", ({ Given, When, Then, And }) => {
      Given("a course with a folder named {string}", givenCourse);
      And("an assistant is chosen that says {string}", (_, words: string) => {
        assistant = { ...noAssistant, capabilities: () => ({ streaming: false, maxContext: 1000, local: true, modelId: "fake" }), explain: async () => words };
        build();
      });
      When("the lecturer asks for an explanation of {string}", explain);
      Then("the explanation shall be {string}", (_, words: string) => expect(explanation).toBe(words));
    });
  });

  Rule("If a plan names a path outside the course folder, then the Studio shall refuse the whole plan before changing anything.", ({ RuleScenario }) => {
    RuleScenario("A plan that reaches out of the course", ({ Given, When, Then, And }) => {
      Given("a course with a folder named {string}", givenCourse);
      When("the lecturer applies a plan that renames {string} and then writes {string}", applyTwoStep);
      Then("the result shall name {string} as the blocker", blocker);
      And("the course shall be unchanged", unchanged);
    });
  });

  Rule("The Studio shall describe every finding in the words @tutors/course-rules gives it.", ({ RuleScenario }) => {
    RuleScenario("The headless check prints the rules' own sentences", ({ Given, When, Then, And }) => {
      Given("a course with a folder named {string}", givenCourse);
      When("the lecturer checks the course from the command line", async () => {
        lines = [];
        exitCode = await runHeadless(authoring, "check", (line) => lines.push(line));
      });
      Then("every finding line shall end with the message @tutors/course-rules gave it", async () => {
        const messages = (await validate(fs)).map((f) => f.message);
        expect(messages.length).toBeGreaterThan(0);
        for (const message of messages) expect(lines.some((line) => line.endsWith(`: ${message}`))).toBe(true);
      });
      And("the last line shall read {string}", (_, text: string) => expect(lines.at(-1)).toBe(text));
      And("the exit code shall be {int}", (_, code: number) => expect(exitCode).toBe(code));
    });
  });
});
