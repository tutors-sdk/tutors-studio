import { describe, expect, it } from "vitest";
import { memoryAgentAccess } from "../../src/adapters/agent-access/memory/memory-agent-access.ts";
import { mcpToolHost } from "../../src/adapters/tool-host/mcp/mcp-tool-host.ts";

describe("Studio's MCP tools", () => {
  // A change to this list or a tool's schema needs an ADR (ADR 0007).
  it("are the reading tools, the propose tools and plan_apply", () => {
    const names = mcpToolHost({ course: "c", access: memoryAgentAccess(), version: "test" })
      .tools()
      .map((tool) => tool.name);
    expect(names).toEqual([
      "course_map",
      "course_check",
      "course_details",
      "course_outcomes",
      "course_term",
      "propose_fix_all",
      "propose_arrange",
      "propose_details",
      "propose_outcomes",
      "propose_tag",
      "propose_release",
      "propose_show_due",
      "plan_apply",
    ]);
    for (const name of names) expect(name).toMatch(/^[a-zA-Z0-9_-]{1,64}$/);
  });

  it("serve over stdio only, for now", async () => {
    await expect(mcpToolHost({ course: "c", access: memoryAgentAccess(), version: "test" }).serve("http")).rejects.toThrow(/stdio/);
  });
});
