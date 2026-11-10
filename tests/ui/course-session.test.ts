import { describe, expect, it, vi } from "vitest";
import { flushSync } from "svelte";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { noAssistant } from "../../src/adapters/assistant/none/none-assistant.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "../../src/adapters/telemetry/local/local-telemetry.ts";
import { createAuthoring } from "../../src/application/use-cases/authoring.ts";
import { CourseSession } from "../../src/ui/course-session.svelte.ts";

function session(hooks: ConstructorParameters<typeof CourseSession>[1] = {}) {
  const fs = new MemoryFileSystem({
    "course.md": "# Web Development\n",
    "properties.yaml": "credits: Leigh\n",
    "topic-01/topic.md": "# Week 1\n",
    "topic-02/topic.md": "# Week 2\n",
    "topic-01/talk-01-html/talk.md": "# HTML\n",
    "topic-01/talk-02-css/talk.md": "# CSS\n",
    "Week 3/notes.md": "# Notes\n",
  });
  let n = 0;
  const authoring = createAuthoring({ fs, rules: courseRules, assistant: noAssistant, telemetry: new LocalTelemetry(), newId: () => `plan-${++n}` });
  return { fs, open: new CourseSession(authoring, hooks) };
}

describe("an open course", () => {
  it("reads the course and knows what is selected, its parent and where items can go", async () => {
    const { open } = session();
    await open.refresh();
    open.selected = "topic-01/talk-01-html";
    flushSync();
    expect(open.selectedNode?.title).toBe("HTML");
    expect(open.parentNode?.path).toBe("topic-01");
    expect(open.visibleScope).toBe("week");
    expect(open.places.map((place) => place.title)).toEqual(["The top of the course", "Week 1", "Week 2"]);
    expect(open.errors).toBeGreaterThan(0);
  });

  it("shows an arrangement's plan, changes nothing until it is accepted, then looks where it says", async () => {
    const select = vi.fn();
    const applied = vi.fn();
    const { fs, open } = session({ select, applied });
    await open.refresh();
    await open.arrange({ action: "move", item: "topic-01/talk-02-css", into: "topic-02" });
    expect(open.arranging?.plan.summary).toBe('Move "CSS" to "Week 2"');
    expect(Object.keys(fs.snapshot())).toContain("topic-01/talk-02-css/talk.md");
    await open.acceptArrange();
    expect(Object.keys(fs.snapshot())).toContain("topic-02/talk-01-css/talk.md");
    expect(open.notice).toBe('Done: Move "CSS" to "Week 2".');
    expect(select).toHaveBeenCalledWith("topic-02/talk-01-css");
    expect(applied).toHaveBeenCalledOnce();
    expect(open.history.map((entry) => entry.summary)).toEqual(['Move "CSS" to "Week 2"']);
  });

  it("says why there is no plan", async () => {
    const { open } = session();
    await open.refresh();
    await open.arrange({ action: "move", item: "topic-02", into: "topic-01" });
    expect(open.arranging).toBeNull();
    expect(open.notice).toContain("Tutors won't show a Topic inside a Topic.");
  });

  it("applies a finding's fix only once it is accepted", async () => {
    const { fs, open } = session();
    await open.refresh();
    const finding = open.view!.findings.find((candidate) => candidate.fix?.op === "write")!;
    open.proposeFix(finding);
    expect(open.pending?.ops[0]).toMatchObject({ op: "write", path: "netlify.toml" });
    expect(Object.keys(fs.snapshot())).not.toContain("netlify.toml");
    await open.accept();
    expect(open.pending).toBeNull();
    expect(Object.keys(fs.snapshot())).toContain("netlify.toml");
    expect(open.notice).toBe("Done: Add netlify.toml.");
  });

  it("marks a written page as saved just now", async () => {
    const { open } = session();
    await open.refresh();
    await open.acceptPage({
      id: "p",
      summary: "Write HTML",
      ops: [{ op: "write", path: "topic-01/talk-01-html/talk.md", content: new TextEncoder().encode("# HTML\n\nTags.\n") }],
    });
    expect(open.savedNow).toEqual(["topic-01/talk-01-html/talk.md"]);
  });
});
