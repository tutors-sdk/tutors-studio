import { describe, expect, it } from "vitest";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { memoryLibrary } from "../../src/adapters/library/memory/memory-library.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { createComposedCourse, planComposedCourse } from "../../src/application/use-cases/compose-course.ts";
import type { ComposePick } from "../../src/domain/compose.ts";

const library = memoryLibrary({
  "/lib": new MemoryFileSystem({
    "web/course.md": "# Web\n",
    "web/topic-01/topic.md": "# Arrays\n",
    "web/topic-01/img/topic.png": "png",
    "web/topic-01/lab-01-arrays/01.Start.md": "# Start\n",
    "web/topic-01/lab-01-arrays/.DS_Store": "junk",
    "web/topic-02/topic.md": "# Loops\n",
    "web/topic-02/lab-01/01.Start.md": "# Loops lab\n",
    "web/topic-02/talk-01/talk.md": "# Loops talk\n",
  }),
});
const deps = { library, rules: courseRules, newId: () => "plan-1", today: () => "2026-11-25" };
const course = { library: "/lib", path: "web", title: "Web" };
const pick = (path: string, kind: string, week: number): ComposePick => ({ course, item: { path, kind, title: path }, week });
const written = (ops: { op: string; path?: string }[]) => ops.flatMap((op) => (op.op === "write" && op.path ? [op.path] : []));

describe("composing a course from the library", () => {
  it("puts two whole weeks in one week, renumbering what would clash, and leaves hidden files behind", async () => {
    const planned = await planComposedCourse(deps, { name: "Mixed", lecturer: "", weeks: 1 }, [pick("topic-01", "topic", 1), pick("topic-02", "topic", 1)]);
    if (!planned.ok) throw new Error(planned.problems[0].message);
    const paths = written(planned.compose.plan.ops);
    expect(paths).toEqual(
      expect.arrayContaining([
        "unit-1/topic-01/lab-01-arrays/01.Start.md",
        "unit-1/topic-01/lab-02/01.Start.md",
        "unit-1/topic-01/talk-01/talk.md",
        "unit-1/topic-01/img/topic.png",
      ]),
    );
    expect(paths.some((path) => path.endsWith(".DS_Store"))).toBe(false);
    const topic = planned.compose.plan.ops.find((op) => op.op === "write" && op.path === "unit-1/topic-01/topic.md");
    expect(topic && "content" in topic ? new TextDecoder().decode(topic.content) : "").toBe("# Arrays\n");
  });

  it("says what is wrong with the answers and the picks", async () => {
    const none = await planComposedCourse(deps, { name: "  ", lecturer: "", weeks: 0 }, []);
    expect(none.ok ? [] : none.problems.map((p) => p.field)).toEqual(["name", "weeks", "picks"]);
    const short = await planComposedCourse(deps, { name: "M", lecturer: "", weeks: 1 }, [pick("topic-02/lab-01", "lab", 3)]);
    expect(short.ok ? "" : short.problems[0].message).toBe("Something you picked goes in week 3, so the course needs at least 3 weeks.");
    const unit = await planComposedCourse(deps, { name: "M", lecturer: "", weeks: 1 }, [pick("unit-1", "unit", 1)]);
    expect(unit.ok ? "" : unit.problems[0].message).toContain("holds weeks of its own");
  });

  it("makes the course in a new folder, and creates nothing when the folder can't be made", async () => {
    const fs = new MemoryFileSystem({});
    const made = await createComposedCourse({ ...deps, makeFolder: async () => fs }, { name: "Mixed", lecturer: "", weeks: 2 }, [pick("topic-02/talk-01", "talk", 2)]);
    expect(made.ok && made.folder).toBe("mixed");
    expect(await fs.exists("unit-1/topic-02/talk-01/talk.md")).toBe(true);
    const refused = await createComposedCourse({ ...deps, makeFolder: async () => Promise.reject(new Error("mixed: already exists")) }, { name: "Mixed", lecturer: "", weeks: 2 }, [
      pick("topic-02/talk-01", "talk", 2),
    ]);
    expect(refused.ok ? "" : refused.reason).toBe("Nothing was created: mixed: already exists");
    const bad = await createComposedCourse({ ...deps, makeFolder: async () => fs }, { name: "", lecturer: "", weeks: 2 }, [pick("topic-02/talk-01", "talk", 2)]);
    expect(bad.ok).toBe(false);
  });
});
