import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { memoryAgentPlans } from "../../src/adapters/agent-plans/memory/memory-agent-plans.ts";
import { nodeAgentPlans } from "../../src/adapters/agent-plans/node/node-agent-plans.ts";
import type { AgentPlansPort } from "../../src/application/ports/agent-plans.ts";
import { courseKey } from "../../src/domain/agent.ts";
import { planFromJson, planToJson, type Plan } from "../../src/domain/plan.ts";

const plan: Plan = {
  id: "plan-1",
  summary: "Tidy week 1",
  ops: [
    { op: "write", path: "topic-01/topic.md", content: new Uint8Array([35, 32, 0xc3, 0xa9, 0, 255]) },
    { op: "move", from: "topic-01/talk-01 Intro", to: "topic-01/talk-01-intro" },
  ],
};

const contract = (name: string, make: () => AgentPlansPort) =>
  describe(`${name} keeps an assistant's plans for the lecturer (ADR 0052)`, () => {
    it("knows when the window has the course open, and when it closes it", async () => {
      const plans = make();
      const course = join(tmpdir(), "a course");
      expect(await plans.isOpen(course)).toBe(false);
      await plans.opened(course);
      expect(await plans.isOpen(course)).toBe(true);
      expect(await plans.isOpen(join(tmpdir(), "another"))).toBe(false);
      await plans.opened(null);
      expect(await plans.isOpen(course)).toBe(false);
    });

    it("keeps each course's plans apart, oldest first, until settled", async () => {
      const plans = make();
      const course = join(tmpdir(), "a course");
      await plans.hand(course, plan);
      await plans.hand(course, { ...plan, id: "plan-2" });
      await plans.hand(join(tmpdir(), "another"), { ...plan, id: "plan-3" });
      const waiting = await plans.waiting(course);
      expect(waiting.map((entry) => entry.plan.id)).toEqual(["plan-1", "plan-2"]);
      expect(waiting[0].plan).toEqual(plan);
      await plans.settle(course, waiting[0].id);
      expect((await plans.waiting(course)).map((entry) => entry.plan.id)).toEqual(["plan-2"]);
    });
  });

contract("memory", () => memoryAgentPlans());
contract("node", () => nodeAgentPlans(mkdtempSync(join(tmpdir(), "studio-config-"))));

describe("the node plans on disk", () => {
  it("are files the app's Rust side reads: studio-open.json and agent-plans/<id>.json", async () => {
    const folder = mkdtempSync(join(tmpdir(), "studio-config-"));
    const plans = nodeAgentPlans(folder, () => 4242);
    await plans.opened("/courses/web-dev/");
    expect(JSON.parse(readFileSync(join(folder, "studio-open.json"), "utf8"))).toEqual({ course: courseKey("/courses/web-dev", process.platform === "win32"), pid: 4242 });
    await plans.hand("/courses/web-dev", plan);
    const [file] = readdirSync(join(folder, "agent-plans"));
    expect(file).toMatch(/^[a-z0-9-]+\.json$/);
    expect(JSON.parse(readFileSync(join(folder, "agent-plans", file), "utf8")).course).toBe(courseKey("/courses/web-dev", process.platform === "win32"));
  });

  it("treat a window that has gone as closed", async () => {
    const folder = mkdtempSync(join(tmpdir(), "studio-config-"));
    writeFileSync(join(folder, "studio-open.json"), JSON.stringify({ course: courseKey(join(tmpdir(), "c"), process.platform === "win32"), pid: 2 ** 22 + 12345 }));
    expect(await nodeAgentPlans(folder).isOpen(join(tmpdir(), "c"))).toBe(false);
  });

  it("settle only a queue id, never another file", async () => {
    const folder = mkdtempSync(join(tmpdir(), "studio-config-"));
    writeFileSync(join(folder, "agent-courses.json"), "{}");
    await nodeAgentPlans(folder).settle("", "../agent-courses");
    expect(readdirSync(folder)).toContain("agent-courses.json");
  });
});

describe("a plan as text", () => {
  it("comes back the same, bytes and all", () => {
    expect(planFromJson(planToJson(plan))).toEqual(plan);
  });

  it("is null for anything planToJson didn't write", () => {
    expect(planFromJson("not json")).toBeNull();
    expect(planFromJson(JSON.stringify({ id: "x", summary: "y", ops: [{ op: "delete", path: "a" }] }))).toBeNull();
    expect(planFromJson(JSON.stringify({ id: 1, summary: "y", ops: [] }))).toBeNull();
  });
});

describe("a course's one spelling", () => {
  it("is forward slashes with no slash at the end, lower case on Windows", () => {
    expect(courseKey("C:\\Users\\L\\Web Dev\\", true)).toBe("c:/users/l/web dev");
    expect(courseKey("/home/L/Web Dev/", false)).toBe("/home/L/Web Dev");
    expect(courseKey("/", false)).toBe("/");
  });
});
