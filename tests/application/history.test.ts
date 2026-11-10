import { describe, expect, it } from "vitest";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { noAssistant } from "../../src/adapters/assistant/none/none-assistant.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "../../src/adapters/telemetry/local/local-telemetry.ts";
import { createAuthoring } from "../../src/application/use-cases/authoring.ts";
import { binName, BIN_FOLDER, undoProblems, undoSummary } from "../../src/domain/history.ts";
import type { Plan } from "../../src/domain/plan.ts";

const bytes = (text: string) => new TextEncoder().encode(text);

function session(files: Record<string, string>) {
  const fs = new MemoryFileSystem(files);
  let id = 0;
  const authoring = createAuthoring({ fs, rules: courseRules, assistant: noAssistant, telemetry: new LocalTelemetry(), newId: () => `p${++id}`, now: () => new Date(0) });
  const apply = async (ops: Plan["ops"], summary = "Change") => {
    const plan = { id: `p${++id}`, summary, ops };
    expect(await authoring.apply(plan)).toEqual({ ok: true });
    return plan.id;
  };
  return { fs, authoring, apply };
}

describe("history and undo", () => {
  it("names nothing it has no record of, and never puts a change back twice", async () => {
    const { authoring, apply } = session({ "a.md": "# A" });
    expect(await authoring.planUndo("nope")).toEqual({ ok: false, message: undoProblems.unknown() });
    const id = await apply([{ op: "move", from: "a.md", to: "b.md" }]);
    const planned = await authoring.planUndo(id);
    if (!planned.ok) throw new Error(planned.message);
    await authoring.apply(planned.plan);
    expect(authoring.history().map((entry) => [entry.summary, entry.undone])).toEqual([
      ["Put back: change", false],
      ["Change", true],
    ]);
    expect(await authoring.planUndo(id)).toEqual({ ok: false, message: undoProblems.alreadyUndone() });
  });

  it("won't move something back that has moved again, or onto something now in its place", async () => {
    const { fs, authoring, apply } = session({ "a.md": "# A" });
    const id = await apply([{ op: "move", from: "a.md", to: "b.md" }]);
    await fs.write("a.md", bytes("new"));
    expect(await authoring.planUndo(id)).toEqual({ ok: false, message: undoProblems.occupied("a.md") });
    await fs.move("b.md", "c.md");
    expect(await authoring.planUndo(id)).toEqual({ ok: false, message: undoProblems.movedSince("b.md") });
  });

  it("puts back what a write replaced, and refuses once the file was removed", async () => {
    const { fs, authoring, apply } = session({ "a.md": "# Old" });
    const id = await apply([{ op: "write", path: "a.md", content: bytes("# New") }]);
    expect(await authoring.planUndo(id)).toMatchObject({ ok: true, plan: { ops: [{ op: "write", path: "a.md", content: bytes("# Old") }] } });
    await fs.remove("a.md");
    expect(await authoring.planUndo(id)).toEqual({ ok: false, message: undoProblems.changedSince("a.md") });
  });

  it("sends a folder the change made to the bin whole, beside what is already there", async () => {
    const { authoring, apply } = session({ "topic-01/topic.md": "# W", [`${BIN_FOLDER}/talk-01/talk.md`]: "# Old" });
    const id = await apply([
      { op: "write", path: "topic-01/talk-01/talk.md", content: bytes("# T") },
      { op: "write", path: "topic-01/talk-01/slides.pdf", content: bytes("%PDF") },
      { op: "write", path: "topic-01/notes.md", content: bytes("# N") },
    ]);
    const planned = await authoring.planUndo(id);
    expect(planned).toEqual({
      ok: true,
      plan: {
        id: expect.any(String),
        summary: "Put back: change",
        ops: [
          { op: "move", from: "topic-01/notes.md", to: `${BIN_FOLDER}/notes.md` },
          { op: "move", from: "topic-01/talk-01", to: `${BIN_FOLDER}/talk-01-2` },
        ],
      },
    });
  });
});

describe("history words", () => {
  it("numbers a name the bin has, before a file's extension", () => {
    expect(binName("a.pdf", new Set(["a.pdf", "a-2.pdf"]))).toBe("a-3.pdf");
    expect(binName("talk-01", new Set())).toBe("talk-01");
    expect(binName(".hidden", new Set([".hidden"]))).toBe(".hidden-2");
    expect(undoSummary("Add a lab")).toBe("Put back: add a lab");
  });
});
