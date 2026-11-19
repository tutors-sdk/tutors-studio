import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { nodeAgentAccess, studioConfigFolder } from "../../src/adapters/agent-access/node/node-agent-access.ts";
import { memoryAgentAccess } from "../../src/adapters/agent-access/memory/memory-agent-access.ts";
import type { AgentAccessPort } from "../../src/application/ports/agent-access.ts";
import { courseKey } from "../../src/domain/agent.ts";

const contract = (name: string, make: () => AgentAccessPort) =>
  describe(`${name} keeps which courses an assistant may work on`, () => {
    it("is off until turned on, and off again when turned off", async () => {
      const access = make();
      const course = join(tmpdir(), "a course");
      expect(await access.allowed(course)).toBe(false);
      await access.set(course, true);
      expect(await access.allowed(course)).toBe(true);
      expect(await access.allowed(join(tmpdir(), "another"))).toBe(false);
      await access.set(course, false);
      expect(await access.allowed(course)).toBe(false);
    });
  });

contract("memory", () => memoryAgentAccess());
contract("node", () => nodeAgentAccess(mkdtempSync(join(tmpdir(), "studio-config-"))));

describe("the node list on disk", () => {
  it("is agent-courses.json with each course folder, so the app's Rust side reads the same file", async () => {
    const folder = mkdtempSync(join(tmpdir(), "studio-config-"));
    await nodeAgentAccess(folder).set("/courses/web-dev", true);
    expect(JSON.parse(readFileSync(join(folder, "agent-courses.json"), "utf8"))).toEqual({ courses: [courseKey(resolve("/courses/web-dev"), process.platform === "win32")] });
  });

  it("sits in Studio's own settings folder on each system", () => {
    expect(studioConfigFolder({ APPDATA: "C:\\Users\\l\\AppData\\Roaming" }, "win32")).toBe(join("C:\\Users\\l\\AppData\\Roaming", "dev.tutors.studio"));
    expect(studioConfigFolder({ XDG_CONFIG_HOME: "/home/l/.config" }, "linux")).toBe(join("/home/l/.config", "dev.tutors.studio"));
    expect(studioConfigFolder({ STUDIO_CONFIG_DIR: "/tmp/x" }, "darwin")).toBe("/tmp/x");
  });
});
