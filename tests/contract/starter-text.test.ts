import { describe, expect, it } from "vitest";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";

describe("starter text", () => {
  it("is found in every page a new course is made with, and not in the lecturer's own writing", () => {
    const files = courseRules
      .newCourseFiles({ name: "Web Development", lecturer: "Ann Lee", start: "2027-01-25", weeks: 2, readingWeek: null, pattern: "lecture-lab", shape: null })
      .filter((file) => file.path.endsWith(".md") && !file.path.endsWith("unit.md"));
    expect(files.filter((file) => !courseRules.hasStarterText(file.content)).map((file) => file.path)).toEqual([]);
    expect(courseRules.hasStarterText("---\nicon:\n  type: x\n---\n\n# Week 1 lab\n\nInstall Node 22, then open VS Code.\n")).toBe(false);
  });
});
