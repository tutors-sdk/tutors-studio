import { describe, expect, it } from "vitest";
import {
  groupOf,
  itemsOf,
  lastPart,
  LIBRARY_MARKERS,
  libraryLine,
  libraryOrder,
  libraryProgressLine,
  lookedLine,
  NEVER_SEARCHED_STARTS,
  searchedFolder,
  type LibraryCourse,
} from "../../src/domain/library.ts";
import { REGISTRY_FILE } from "../../src/domain/registry.ts";
import type { CourseFolder } from "../../src/domain/course-map.ts";
import type { Finding } from "../../src/domain/finding.ts";

const folder = (path: string, kind: string | null, title: string | null, children: CourseFolder[] = []): CourseFolder => ({
  name: path.split("/").pop() ?? path,
  path,
  kind,
  title,
  files: [],
  children,
});
const course = (over: Partial<LibraryCourse>): LibraryCourse => ({
  library: "/home/me/Teaching",
  path: "web-dev",
  title: "Web Development",
  group: "ready",
  errors: 0,
  warnings: 0,
  items: [],
  ...over,
});
const finding = (severity: Finding["severity"]): Finding => ({ rule: "V001", severity, path: "", message: "m" });

describe("the library", () => {
  it("searches every folder but hidden ones, dependencies and Tutors' build output", () => {
    expect(searchedFolder("2026")).toBe(true);
    expect(searchedFolder(".git")).toBe(false);
    expect(searchedFolder("node_modules")).toBe(false);
    expect(searchedFolder("json")).toBe(false);
    expect(searchedFolder("html")).toBe(false);
    expect(searchedFolder("_site")).toBe(false);
  });

  it("calls a course with any error one that needs fixing, and warnings alone ready", () => {
    expect(groupOf([])).toBe("ready");
    expect(groupOf([finding("warn"), finding("info")])).toBe("ready");
    expect(groupOf([finding("warn"), finding("error")])).toBe("needs-fixing");
  });

  it("lists every learning object outermost first, with its title or its folder's name", () => {
    const tree = folder("", "course", "Web", [
      folder("topic-01", "topic", "Week 1", [folder("topic-01/lab-01", "lab", null), folder("topic-01/files", null, null)]),
      folder("notes", null, null, [folder("notes/talk-01", "talk", "Hidden")]),
    ]);
    expect(itemsOf(tree)).toEqual([
      { path: "topic-01", kind: "topic", title: "Week 1" },
      { path: "topic-01/lab-01", kind: "lab", title: "lab-01" },
    ]);
  });

  it("says each course in one line", () => {
    expect(libraryLine(course({ items: [{ path: "t", kind: "topic", title: "T" }] }))).toBe("Ready: Web Development in web-dev (1 item)");
    expect(libraryLine(course({ path: "", warnings: 2 }))).toBe("Ready: Web Development in Teaching (0 items, 2 warnings)");
    expect(libraryLine(course({ group: "needs-fixing", errors: 3 }))).toBe("Needs fixing: Web Development in web-dev (3 problems to fix before its items can be used)");
    expect(libraryLine(course({ group: "needs-fixing", errors: 1 }))).toBe("Needs fixing: Web Development in web-dev (1 problem to fix before its items can be used)");
  });

  it("puts ready courses first, then by title and place", () => {
    const order = libraryOrder([course({ title: "B", group: "needs-fixing" }), course({ title: "C" }), course({ title: "A", path: "z" }), course({ title: "A", path: "a" })]).map(
      (c) => `${c.title}:${c.path}`,
    );
    expect(order).toEqual(["A:a", "A:z", "C:web-dev", "B:web-dev"]);
  });

  it("names a folder by the last part of its path on any computer", () => {
    expect(lastPart("C:\\Users\\me\\Teaching\\")).toBe("Teaching");
    expect(lastPart("/home/me/Teaching")).toBe("Teaching");
  });
});

describe("a library search as it goes (STU-0301, STU-0303)", () => {
  it("says how far it has looked, then which course it is checking", () => {
    expect(libraryProgressLine({ stage: "looking", library: "C:\\Users\\me\\Teaching", looked: 1204, found: 1 })).toBe("Looking in Teaching: 1,204 folders so far, 1 course found");
    expect(libraryProgressLine({ stage: "checking", library: "/t", checking: 2, of: 7, course: "web-dev" })).toBe("Checking 2 of 7: web-dev");
    expect(lookedLine("/home/me/Teaching", 5, 2)).toBe("Looked in 5 folders in Teaching and found 2 courses.");
  });

  it("passes over folders that hold software, hidden ones and Windows' own", () => {
    for (const name of ["node_modules", "target", "build", "AppData", ".git", "$RECYCLE.BIN"]) expect(searchedFolder(name), name).toBe(false);
    for (const name of ["Teaching", "2026", "web-dev", "Library"]) expect(searchedFolder(name), name).toBe(true);
    expect(NEVER_SEARCHED_STARTS).toEqual([".", "$"]);
    expect(LIBRARY_MARKERS[0]).toBe(REGISTRY_FILE);
  });
});
