import { describe, expect, it } from "vitest";
import { libraryShownLine, libraryTutorsLine, libraryVisitFor, mergeLibraryVisits, showable } from "../../src/domain/library-tutors.ts";
import type { LibraryCourse } from "../../src/domain/library.ts";

const course = (over: Partial<LibraryCourse> = {}): LibraryCourse => ({
  library: "/home/me/Teaching",
  path: "web-dev",
  title: "Web Development",
  group: "ready",
  errors: 0,
  warnings: 0,
  items: [],
  ...over,
});

describe("the library in Tutors (ADR 0068)", () => {
  it("shows only ready courses kept as folders on this computer", () => {
    expect(showable(course())).toBe(true);
    expect(showable(course({ group: "needs-fixing", errors: 2 }))).toBe(false);
    expect(showable(course({ library: "gdrive:abc/Shared" }))).toBe(false);
    expect(showable(course({ entry: { registry: "", publisher: "setu", name: "web", version: 1, licence: "CC-BY-4.0", from: "Web", folders: [] } }))).toBe(false);
  });

  it("lists a course by where it is served and where it is in the library", () => {
    expect(libraryVisitFor(course(), 8301)).toEqual({ id: "127.0.0.1:8301", title: "Web Development", credits: "In your library: Teaching/web-dev" });
    expect(libraryVisitFor(course({ path: "" }), 8300).credits).toBe("In your library: Teaching");
  });

  it("keeps the lecturer's own courses, retitles listed ones, and takes off what Studio no longer serves", () => {
    const merged = mergeLibraryVisits(
      [
        { id: "reference-course", title: "Reference", favourite: true },
        { id: "127.0.0.1:8300", title: "Old", visits: 2 },
        { id: "127.0.0.1:8301", title: "Gone" },
      ],
      [
        { id: "127.0.0.1:8300", title: "Web Development", credits: "In your library: Teaching/web-dev" },
        { id: "127.0.0.1:8302", title: "Mobile Apps", credits: "In your library: Teaching/mobile" },
      ],
      ["127.0.0.1:8300", "127.0.0.1:8301"],
      "2026-11-28T15:00:00.000Z",
    );
    expect(merged.visits).toEqual([
      { id: "reference-course", title: "Reference", favourite: true },
      { id: "127.0.0.1:8300", title: "Web Development", credits: "In your library: Teaching/web-dev", visits: 2 },
      { id: "127.0.0.1:8302", title: "Mobile Apps", credits: "In your library: Teaching/mobile", lastVisit: "2026-11-28T15:00:00.000Z", visits: 0 },
    ]);
    expect(merged.ids).toEqual(["127.0.0.1:8300", "127.0.0.1:8302"]);
  });

  it("leaves a course the lecturer read on its own port, though Studio once served one there", () => {
    const merged = mergeLibraryVisits([{ id: "127.0.0.1:8190", title: "My course" }], [], [], "now");
    expect(merged.visits).toEqual([{ id: "127.0.0.1:8190", title: "My course" }]);
  });

  it("says how it is going and how it went", () => {
    expect(libraryTutorsLine({ stage: "building", building: 2, of: 5, course: "Web Development" })).toBe("Building 2 of 5: Web Development");
    expect(libraryTutorsLine({ stage: "opening" })).toBe("Opening Tutors with your library");
    expect(libraryShownLine(3, 0, false)).toBe("Tutors lists 3 courses from your library.");
    expect(libraryShownLine(1, 2, false)).toBe("Tutors lists 1 course from your library. 2 didn't build: each is named below.");
  });
});
