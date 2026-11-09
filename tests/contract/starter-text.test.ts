import { describe, expect, it } from "vitest";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";

describe("starter text", () => {
  it("is found in every page a new course is made with, and not in the lecturer's own writing", () => {
    const files = courseRules
      .newCourseFiles({ name: "Web Development", lecturer: "Ann Lee", weeks: 2, shape: { lectures: 1, labs: 1, readings: 1 }, project: true })
      .filter((file) => file.path.endsWith(".md") && !file.path.endsWith("unit.md"));
    expect(files.filter((file) => !courseRules.hasStarterText(file.content)).map((file) => file.path)).toEqual([]);
    expect(courseRules.hasStarterText("---\nicon:\n  type: x\n---\n\n# Week 1 lab\n\nInstall Node 22, then open VS Code.\n")).toBe(false);
  });
});
