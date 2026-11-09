import { describe, expect, it } from "vitest";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { parseNewArgs, newUsage } from "../../src/adapters/cli/headless/headless.ts";
import { createNewCourse, planNewCourse } from "../../src/application/use-cases/new-course.ts";
import { defaultShape, type CourseAnswers } from "../../src/domain/new-course.ts";

const answers: CourseAnswers = { name: "  Web Development ", lecturer: "Ann Lee", weeks: 3, shape: defaultShape, project: false };

describe("planning a new course", () => {
  it("is one plan of writes, summarised in the lecturer's terms, and writes nothing", () => {
    const planned = planNewCourse(courseRules, answers, () => "p1");
    expect(planned.ok).toBe(true);
    if (!planned.ok) return;
    expect(planned.folder).toBe("web-development");
    expect(planned.plan.id).toBe("p1");
    expect(planned.plan.summary).toBe("Create Web Development: 3 weeks, each with 1 lecture and 1 lab");
    expect(planned.plan.ops.every((op) => op.op === "write")).toBe(true);
    expect(planned.plan.ops.map((op) => (op.op === "write" ? op.path : ""))).toContain("unit-1/topic-03/topic.md");
  });

  it("names a single week and a project in the summary, and writes no calendar or dates", () => {
    const one = planNewCourse(courseRules, { ...answers, weeks: 1, project: true }, () => "p");
    expect(one.ok && one.plan.summary).toBe("Create Web Development: 1 week, each with 1 lecture and 1 lab, and a project");
    const planned = planNewCourse(courseRules, answers, () => "p");
    if (!planned.ok) throw new Error("planned");
    const text = (path: string) => {
      const op = planned.plan.ops.find((candidate) => candidate.op === "write" && candidate.path === path);
      return op && op.op === "write" ? new TextDecoder().decode(op.content) : "";
    };
    expect(planned.plan.ops.some((op) => op.op === "write" && op.path === "calendar.yaml")).toBe(false);
    expect(text("unit-1/topic-01/topic.md")).not.toMatch(/Week of|2001/);
    expect(text("unit-1/unit.md")).toBe("Weeks 1–3\n\nWeeks 1–3.\n");
  });

  it("refuses wrong answers with their problems", () => {
    expect(planNewCourse(courseRules, { ...answers, weeks: 0 }, () => "p")).toEqual({
      ok: false,
      problems: [{ field: "weeks", message: "Teaching weeks must be a whole number from 1 to 52." }],
    });
  });
});

describe("creating a new course", () => {
  it("makes the folder, writes the plan, and hands back the course's file system", async () => {
    const made: string[] = [];
    const fs = new MemoryFileSystem({});
    const result = await createNewCourse({ rules: courseRules, newId: () => "p", makeFolder: async (name) => (made.push(name), fs) }, answers);
    expect(result).toEqual({ ok: true, folder: "web-development", fs });
    expect(made).toEqual(["web-development"]);
    expect(Object.keys(fs.snapshot())).toContain("course.md");
  });

  it("makes no folder for wrong answers, and gives the first problem as the reason", async () => {
    let asked = false;
    const result = await createNewCourse({ rules: courseRules, newId: () => "p", makeFolder: async () => ((asked = true), new MemoryFileSystem({})) }, { ...answers, name: "" });
    expect(asked).toBe(false);
    expect(result).toMatchObject({ ok: false, reason: "Give the course a name with at least one letter or number." });
  });

  it("reports a folder that couldn't be made, and a plan that couldn't be applied", async () => {
    const refused = await createNewCourse({ rules: courseRules, newId: () => "p", makeFolder: () => Promise.reject(new Error("web-development already exists")) }, answers);
    expect(refused).toEqual({ ok: false, problems: [], reason: "Nothing was created: web-development already exists" });
    const thrown = await createNewCourse({ rules: courseRules, newId: () => "p", makeFolder: () => Promise.reject("disk full") }, answers);
    expect(thrown).toMatchObject({ reason: "Nothing was created: disk full" });
    const locked = new MemoryFileSystem({});
    locked.failOn.add("course.md");
    const blocked = await createNewCourse({ rules: courseRules, newId: () => "p", makeFolder: async () => locked }, answers);
    expect(blocked).toMatchObject({ ok: false, reason: expect.stringMatching(/^The course wasn't created: course\.md \(/) });
    expect(locked.snapshot()).toEqual({});
  });
});

describe("headless new arguments", () => {
  it("reads the answers, with 12 weeks of a lecture and a lab and no project by default", () => {
    expect(parseNewArgs(["courses", "--name", "Web", "--lecturer", "Ann", "--project"])).toEqual({
      parent: "courses",
      answers: { name: "Web", lecturer: "Ann", weeks: 12, shape: { lectures: 1, labs: 1, readings: 0 }, project: true },
    });
    expect(parseNewArgs(["c", "--lectures", "2", "--labs", "1"])).toMatchObject({ answers: { shape: { lectures: 2, labs: 1, readings: 0 }, project: false } });
    expect(parseNewArgs(["c", "--weeks", "4"])).toMatchObject({ answers: { weeks: 4, name: "" } });
  });

  it("refuses a missing value, an unknown option, and anything but one parent folder", () => {
    expect(parseNewArgs(["c", "--name"])).toBe(`--name needs a value. ${newUsage}`);
    expect(parseNewArgs(["c", "--colour", "red"])).toBe(`Unknown option --colour. ${newUsage}`);
    expect(parseNewArgs([])).toBe(`Name one parent folder. ${newUsage}`);
    expect(parseNewArgs(["a", "b"])).toBe(`Name one parent folder. ${newUsage}`);
  });
});
