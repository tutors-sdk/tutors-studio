import { describe, expect, it } from "vitest";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { parseNewArgs, newUsage } from "../../src/adapters/cli/headless/headless.ts";
import { createNewCourse, planNewCourse } from "../../src/application/use-cases/new-course.ts";
import type { CourseAnswers } from "../../src/domain/new-course.ts";

const answers: CourseAnswers = { name: "  Web Development ", lecturer: "Ann Lee", start: "2027-01-25", weeks: 3, readingWeek: null, pattern: "lecture-lab" };

describe("planning a new course", () => {
  it("is one plan of writes, summarised in the lecturer's terms, and writes nothing", () => {
    const planned = planNewCourse(courseRules, answers, () => "p1");
    expect(planned.ok).toBe(true);
    if (!planned.ok) return;
    expect(planned.folder).toBe("web-development");
    expect(planned.plan.id).toBe("p1");
    expect(planned.plan.summary).toBe("Create Web Development: 3 weeks of lecture and lab");
    expect(planned.plan.ops.every((op) => op.op === "write")).toBe(true);
    expect(planned.plan.ops.map((op) => (op.op === "write" ? op.path : ""))).toContain("unit-1/topic-03/topic.md");
  });

  it("names a reading week and a single week in the summary", () => {
    const planned = planNewCourse(courseRules, { ...answers, weeks: 4, readingWeek: 2 }, () => "p");
    expect(planned.ok && planned.plan.summary).toBe("Create Web Development: 4 weeks of lecture and lab, reading week after week 2");
    const one = planNewCourse(courseRules, { ...answers, weeks: 1, pattern: "flipped" }, () => "p");
    expect(one.ok && one.plan.summary).toMatch(/^Create Web Development: 1 week of /);
  });

  it("refuses wrong answers with their problems", () => {
    expect(planNewCourse(courseRules, { ...answers, pattern: "seminar" }, () => "p")).toEqual({
      ok: false,
      problems: [{ field: "pattern", message: "Choose how you teach the course." }],
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
    const result = await createNewCourse({ rules: courseRules, newId: () => "p", makeFolder: async () => ((asked = true), new MemoryFileSystem({})) }, { ...answers, start: "" });
    expect(asked).toBe(false);
    expect(result).toMatchObject({ ok: false, reason: "Choose the date teaching starts." });
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
  it("reads the answers, with 12 weeks and no reading week by default", () => {
    expect(parseNewArgs(["courses", "--name", "Web", "--start", "2027-01-25", "--pattern", "flipped", "--lecturer", "Ann", "--reading-week", "6"])).toEqual({
      parent: "courses",
      answers: { name: "Web", lecturer: "Ann", start: "2027-01-25", weeks: 12, readingWeek: 6, pattern: "flipped" },
    });
    expect(parseNewArgs(["c", "--weeks", "4"])).toMatchObject({ answers: { weeks: 4, readingWeek: null, name: "", pattern: "" } });
  });

  it("refuses a missing value, an unknown option, and anything but one parent folder", () => {
    expect(parseNewArgs(["c", "--name"])).toBe(`--name needs a value. ${newUsage}`);
    expect(parseNewArgs(["c", "--colour", "red"])).toBe(`Unknown option --colour. ${newUsage}`);
    expect(parseNewArgs([])).toBe(`Name one parent folder. ${newUsage}`);
    expect(parseNewArgs(["a", "b"])).toBe(`Name one parent folder. ${newUsage}`);
  });
});
