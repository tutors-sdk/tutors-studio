import { describe, expect, it } from "vitest";
import { arrangeSummary, canHold, dropAction, stepAction } from "../../src/domain/arrange.ts";
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
  it("moves an item into a folder that can hold it, and never into an item", () => {
    expect(dropAction(course, "topic-01/talk-01-a", "topic-02")).toEqual({ action: "move", item: "topic-01/talk-01-a", into: "topic-02" });
    expect(dropAction(course, "topic-01/talk-01-a", "topic-01/lab-01-x")).toBeNull();
    expect(dropAction(course, "topic-01/talk-01-a", "topic-01")).toBeNull();
  });
  it("puts a week just above or below another, never inside it", () => {
    const three = folder("", "course", "Web", [
      folder("topic-01", "topic", "1"),
      folder("topic-02", "topic", "2", [folder("topic-02/talk-01-a", "talk", "A")]),
      folder("topic-03", "topic", "3"),
    ]);
    expect(dropAction(three, "topic-03", "topic-01", "before")).toEqual({ action: "reorder", folder: "", order: ["topic-03", "topic-01", "topic-02"] });
    expect(dropAction(three, "topic-03", "topic-01", "after")).toEqual({ action: "reorder", folder: "", order: ["topic-01", "topic-03", "topic-02"] });
    expect(dropAction(three, "topic-01", "topic-02", "after")).toEqual({ action: "reorder", folder: "", order: ["topic-02", "topic-01", "topic-03"] });
    // Dropped on a lecture inside week 2, a week goes beside week 2.
    expect(dropAction(three, "topic-01", "topic-02/talk-01-a", "after")).toEqual({ action: "reorder", folder: "", order: ["topic-02", "topic-01", "topic-03"] });
    expect(dropAction(three, "topic-03", "topic-02", "into")).toEqual({ action: "reorder", folder: "", order: ["topic-01", "topic-03", "topic-02"] });
    expect(dropAction(three, "topic-01", "topic-02", "before")).toBeNull();
  });
  it("puts an item just above or below another of its kind, or beside one in another week", () => {
    expect(dropAction(course, "topic-01/talk-01-a", "topic-01/talk-02-b", "after")).toEqual({ action: "reorder", folder: "topic-01", order: ["talk-02-b", "talk-01-a"] });
    expect(dropAction(course, "topic-01/talk-01-a", "topic-01/talk-02-b", "before")).toBeNull();
    const two = folder("", "course", "Web", [
      folder("topic-01", "topic", "1", [folder("topic-01/talk-01-a", "talk", "A")]),
      folder("topic-02", "topic", "2", [folder("topic-02/lab-01-x", "lab", "X")]),
    ]);
    expect(dropAction(two, "topic-01/talk-01-a", "topic-02/lab-01-x", "before")).toEqual({ action: "move", item: "topic-01/talk-01-a", into: "topic-02" });
  });
  it("knows which folders Tutors shows which kinds in", () => {
    expect(canHold("course", "topic")).toBe(true);
    expect(canHold("topic", "topic")).toBe(false);
    expect(canHold("topic", "unit")).toBe(true);
    expect(canHold("unit", "talk")).toBe(true);
    expect(canHold("unit", "unit")).toBe(false);
    expect(canHold("talk", "lab")).toBe(false);
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
