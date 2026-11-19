import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";
import { expect } from "vitest";
import { memoryAgentAccess } from "../../src/adapters/agent-access/memory/memory-agent-access.ts";
import { noAssistant } from "../../src/adapters/assistant/none/none-assistant.ts";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "../../src/adapters/telemetry/local/local-telemetry.ts";
import { mcpToolHost } from "../../src/adapters/tool-host/mcp/mcp-tool-host.ts";
import type { AgentAccessPort } from "../../src/application/ports/agent-access.ts";
import { createAuthoring } from "../../src/application/use-cases/authoring.ts";

const feature = await loadFeature("spec/features/mcp.feature");
const COURSE = "/courses/web-dev";

describeFeature(feature, ({ Background, Rule }) => {
  let fs: MemoryFileSystem;
  let access: AgentAccessPort;
  let client: Client;
  let before: Record<string, string>;
  let tools: Tool[];
  let answer: CallToolResult;
  let planId = "";

  const call = async (name: string, args: Record<string, unknown> = {}): Promise<void> => {
    answer = (await client.callTool({ name, arguments: args })) as CallToolResult;
  };
  const said = () => answer.content.map((part) => (part.type === "text" ? part.text : "")).join("");
  const unchanged = () => expect(fs.snapshot()).toEqual(before);
  const proposeFixes = async () => {
    await call("propose_fix_all");
    expect(answer.isError, said()).toBeFalsy();
    planId = JSON.parse(said()).plan_id;
  };

  Background(({ Given }) => {
    Given("a course with a talk folder named {string}", async (_, talk: string) => {
      fs = new MemoryFileSystem({ "course.md": "# C\n", "topic-01/topic.md": "# W\n", [`topic-01/${talk}/talk.md`]: "# T\n", [`topic-01/${talk}/slides.pdf`]: "%PDF" });
      before = fs.snapshot();
      access = memoryAgentAccess();
      let n = 0;
      const host = mcpToolHost({ course: COURSE, access, version: "test" });
      host.register(createAuthoring({ fs, rules: courseRules, assistant: noAssistant, telemetry: new LocalTelemetry(), newId: () => `plan-${++n}` }));
      const [agentSide, studioSide] = InMemoryTransport.createLinkedPair();
      await host.server().connect(studioSide);
      client = new Client({ name: "agent", version: "1" });
      await client.connect(agentSide);
    });
  });

  const allowed = () => access.set(COURSE, true);

  Rule("The Studio shall expose no tool that writes a file other than plan_apply.", ({ RuleScenario }) => {
    RuleScenario("Proposing changes nothing", ({ Given, When, Then }) => {
      Given("the lecturer lets an assistant on this computer work on the course", allowed);
      When("the agent lists Studio's tools", async () => {
        tools = (await client.listTools()).tools;
      });
      Then("every tool but plan_apply reads or proposes", () => {
        const names = tools.map((tool) => tool.name);
        expect(names).toContain("plan_apply");
        for (const name of names.filter((name) => name !== "plan_apply")) expect(name).toMatch(/^(course_|propose_)/);
      });
      When("the agent proposes every safe fix", proposeFixes);
      Then("the course is unchanged", unchanged);
      When("the agent applies the plan it was given", () => call("plan_apply", { plan_id: planId }));
      Then("{string} is in the course", (_, path: string) => expect(Object.keys(fs.snapshot()), said()).toContain(path));
    });
  });

  Rule(
    "If an agent applies a plan that no propose tool made in the same session, or one already applied, then the Studio shall refuse it and change nothing.",
    ({ RuleScenario }) => {
      RuleScenario("A made-up plan and a plan applied twice", ({ Given, When, Then, And }) => {
        Given("the lecturer lets an assistant on this computer work on the course", allowed);
        When("the agent applies a plan called {string}", (_, id: string) => call("plan_apply", { plan_id: id }));
        Then("Studio refuses with {string}", (_, message: string) => {
          expect(answer.isError).toBe(true);
          expect(said()).toBe(message);
        });
        And("the course is unchanged", unchanged);
        When("the agent proposes every safe fix and applies it twice", async () => {
          await proposeFixes();
          await call("plan_apply", { plan_id: planId });
          expect(answer.isError, said()).toBeFalsy();
          await call("plan_apply", { plan_id: planId });
        });
        Then("the second apply is refused", () => expect(answer.isError).toBe(true));
      });
    },
  );

  Rule('While "Let an assistant on this computer work on this course" is off, the Studio shall refuse every tool call for that course.', ({ RuleScenario }) => {
    RuleScenario("Not allowed on this computer", ({ Given, When, Then }) => {
      Given("the lecturer hasn't let an assistant work on the course", () => access.set(COURSE, false));
      When("the agent asks for the course map", () => call("course_map"));
      Then("Studio refuses because the lecturer hasn't allowed it", () => {
        expect(answer.isError).toBe(true);
        expect(said()).toContain("Let an assistant on this computer work on this course");
      });
      When("the lecturer turns it on and the agent asks again", async () => {
        await allowed();
        await call("course_map");
      });
      Then("the agent gets the course map", () => expect(JSON.parse(said()).kind).toBe("course"));
    });
  });
});
