import { describe, expect, it } from "vitest";
import { arrangeSummary, dropAction, stepAction } from "../../src/domain/arrange.ts";
import type { CourseFolder } from "../../src/domain/course-map.ts";

const folder = (path: string, kind: string | null, title: string | null, children: CourseFolder[] = []): CourseFolder => ({
  name: path.slice(path.lastIndexOf("/") + 1),
  path,
  kind,
  title,
  files: [],
  children,
});
const course = folder("", "course", "Web", [
  folder("topic-01", "topic", "Week 1", [folder("topic-01/talk-01-a", "talk", "A"), folder("topic-01/lab-01-x", "lab", "X"), folder("topic-01/talk-02-b", "talk", "B")]),
  folder("topic-02", "topic", "Week 2"),
  folder("notes", null, null),
]);

describe("dropAction", () => {
  it("puts an item in the place of another of its kind in the same folder", () => {
    expect(dropAction(course, "topic-01/talk-02-b", "topic-01/talk-01-a")).toEqual({ action: "reorder", folder: "topic-01", order: ["talk-02-b", "talk-01-a"] });
    expect(dropAction(course, "topic-02", "topic-01")).toEqual({ action: "reorder", folder: "", order: ["topic-02", "topic-01"] });
  });
  it("moves an item onto a folder of another kind", () => {
    expect(dropAction(course, "topic-01/talk-01-a", "topic-02")).toEqual({ action: "move", item: "topic-01/talk-01-a", into: "topic-02" });
    expect(dropAction(course, "topic-01/talk-01-a", "topic-01/lab-01-x")).toEqual({ action: "move", item: "topic-01/talk-01-a", into: "topic-01/lab-01-x" });
  });
  it("does nothing for a drop on itself, inside itself, of the course or of a folder Tutors doesn't read", () => {
    expect(dropAction(course, "topic-01", "topic-01")).toBeNull();
    expect(dropAction(course, "topic-01", "topic-01/talk-01-a")).toBeNull();
    expect(dropAction(course, "", "topic-01")).toBeNull();
    expect(dropAction(course, "notes", "topic-01")).toBeNull();
    expect(dropAction(course, "missing", "topic-01")).toBeNull();
  });
});

describe("stepAction", () => {
  it("swaps an item with its neighbour of the same kind, skipping other kinds", () => {
    expect(stepAction(course, "topic-01/talk-01-a", 1)).toEqual({ action: "reorder", folder: "topic-01", order: ["talk-02-b", "talk-01-a"] });
    expect(stepAction(course, "topic-01/talk-02-b", -1)).toEqual({ action: "reorder", folder: "topic-01", order: ["talk-02-b", "talk-01-a"] });
  });
  it("has nothing to do at either end, or for the course", () => {
    expect(stepAction(course, "topic-01/talk-01-a", -1)).toBeNull();
    expect(stepAction(course, "topic-01/lab-01-x", 1)).toBeNull();
    expect(stepAction(course, "", 1)).toBeNull();
  });
});

describe("arrangeSummary", () => {
  it("calls topics weeks", () => {
    expect(arrangeSummary(course, { action: "reorder", folder: "", order: ["topic-02", "topic-01"] })).toBe("Put the weeks in the course in a new order");
  });
});
