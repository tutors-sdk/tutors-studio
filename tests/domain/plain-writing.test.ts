import { describe, expect, it } from "vitest";
import { plainWritingProblem, splitSettings } from "../../src/domain/plain-writing.ts";

describe("a page's settings at the top", () => {
  it("are split from the writing, blank line and all, and put back exactly", () => {
    const page = "---\nicon:\n  type: fluent-color:book-24\n---\n\n# Week 1\n\nHello.\n";
    const { settings, writing } = splitSettings(page);
    expect(writing).toBe("# Week 1\n\nHello.\n");
    expect(settings + writing).toBe(page);
    expect(plainWritingProblem(page)).toBeNull();
  });

  it("are none when the page doesn't start with ---, or never closes them", () => {
    expect(splitSettings("# Week 1\n\n---\n\nMore.\n")).toEqual({ settings: "", writing: "# Week 1\n\n---\n\nMore.\n" });
    expect(splitSettings("---\nicon: x\n").settings).toBe("");
  });
});
