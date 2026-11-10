import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { applyPlan } from "../../src/application/use-cases/apply-plan.ts";
import type { Plan } from "../../src/domain/plan.ts";

const bytes = (text: string) => new TextEncoder().encode(text);

describe("applying a plan (ADR 0004)", () => {
  it("applies every op in order", async () => {
    const fs = new MemoryFileSystem({ "Week 3/topic.md": "# W" });
    const plan: Plan = {
      id: "p1",
      summary: "s",
      ops: [
        { op: "move", from: "Week 3", to: "topic-week-3" },
        { op: "write", path: "topic-week-3/talk-01/talk.md", content: bytes("# Talk") },
      ],
    };
    expect(await applyPlan(fs, plan)).toEqual({
      ok: true,
      // The steps that put it back, newest first: the added talk to the bin, then the folder back (STU-0091).
      undo: [
        { kind: "bin", path: "topic-week-3/talk-01/talk.md", written: bytes("# Talk") },
        { kind: "move-back", now: "topic-week-3", was: "Week 3" },
      ],
    });
    expect(fs.snapshot()).toEqual({ "topic-week-3/talk-01/talk.md": "# Talk", "topic-week-3/topic.md": "# W" });
  });

  it("records what a write replaced, so it can be put back", async () => {
    const fs = new MemoryFileSystem({ "topic-01/topic.md": "# Old" });
    const result = await applyPlan(fs, { id: "p", summary: "s", ops: [{ op: "write", path: "topic-01/topic.md", content: bytes("# New") }] });
    expect(result).toEqual({ ok: true, undo: [{ kind: "restore", path: "topic-01/topic.md", content: bytes("# Old"), written: bytes("# New") }] });
  });

  it("refuses an unsafe plan before touching anything", async () => {
    const fs = new MemoryFileSystem({ "a.md": "a" });
    const result = await applyPlan(fs, { id: "p", summary: "s", ops: [{ op: "write", path: "../escape.md", content: bytes("x") }] });
    expect(result).toMatchObject({ ok: false, blockedBy: "../escape.md" });
    expect(fs.snapshot()).toEqual({ "a.md": "a" });
  });

  it("refuses an empty plan, naming no file", async () => {
    expect(await applyPlan(new MemoryFileSystem(), { id: "p", summary: "s", ops: [] })).toMatchObject({ ok: false, blockedBy: "" });
  });

  it("rolls back every op already applied when one fails, restoring overwritten files, and names the file that blocked it", async () => {
    const fs = new MemoryFileSystem({ "Week 3/topic.md": "# W", "course.md": "old", "locked.md": "l" });
    fs.failOn.add("locked.md");
    const result = await applyPlan(fs, {
      id: "p",
      summary: "s",
      ops: [
        { op: "move", from: "Week 3", to: "topic-week-3" },
        { op: "write", path: "course.md", content: bytes("new") },
        { op: "write", path: "new.md", content: bytes("n") },
        { op: "write", path: "locked.md", content: bytes("x") },
      ],
    });
    expect(result).toEqual({ ok: false, blockedBy: "locked.md", reason: "locked.md: permission denied" });
    expect(fs.snapshot()).toEqual({ "Week 3/topic.md": "# W", "course.md": "old", "locked.md": "l" });
  });

  it("property: a plan that fails at any op leaves the course exactly as it was", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 5 }), fc.nat(), async (count, failAt) => {
        const files: Record<string, string> = { "keep.md": "k" };
        for (let i = 0; i < count; i++) files[`f${i}.md`] = `v${i}`;
        const fs = new MemoryFileSystem(files);
        const ops: Plan["ops"] = [];
        for (let i = 0; i < count; i++) ops.push(i % 2 === 0 ? { op: "move", from: `f${i}.md`, to: `g${i}.md` } : { op: "write", path: `f${i}.md`, content: bytes("changed") });
        const target = ops[failAt % ops.length];
        fs.failOn.add(target.op === "move" ? target.to : target.path);
        const before = fs.snapshot();
        const result = await applyPlan(fs, { id: "p", summary: "s", ops });
        expect(result.ok).toBe(false);
        expect(fs.snapshot()).toEqual(before);
      }),
    );
  });
});
