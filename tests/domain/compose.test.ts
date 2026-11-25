import { describe, expect, it } from "vitest";
import { borrowedWords, copiedName, creditsPage, pickable, weeksNeeded, type ComposePick } from "../../src/domain/compose.ts";

const pick = (path: string, kind: string, week: number, course = "web"): ComposePick => ({
  course: { library: "/lib", path: course, title: course },
  item: { path, kind, title: path },
  week,
});

describe("composing a course", () => {
  it("names a copy with its kind and the next free number, keeping the rest of its name", () => {
    expect(copiedName("lab", "lab-01-arrays", [])).toBe("lab-01-arrays");
    expect(copiedName("lab", "lab-01-arrays", ["lab-01", "lab-02-loops", "talk-05"])).toBe("lab-03-arrays");
    expect(copiedName("talk", "talk", ["talk-9"])).toBe("talk-10");
    expect(copiedName("lab", "book-2-Intro", ["lab-01"])).toBe("lab-02-intro");
  });

  it("lets a lecturer pick weeks and items, never units", () => {
    expect(pickable(pick("t", "topic", 1).item)).toBe(true);
    expect(pickable(pick("l", "lab", 1).item)).toBe(true);
    expect(pickable(pick("u", "unit", 1).item)).toBe(false);
    expect(pickable(pick("s", "side", 1).item)).toBe(false);
  });

  it("lists every borrowed item on the credits page, escaping the table", () => {
    const page = creditsPage({
      "b/lab-01": { library: "/l", course: "c", path: "p", from: "Web | Dev", title: "Arrays", digest: "sha256:x", copied: "2026-11-25" },
      "a/talk-01": { library: "/l", course: "c", path: "q", from: "Mobile", title: "Intro", digest: "sha256:y", copied: "2026-11-24" },
    });
    expect(page.split("\n")[0]).toBe("# Borrowed material");
    expect(page.indexOf("Intro")).toBeLessThan(page.indexOf("Arrays"));
    expect(page).toContain("| Arrays | Web \\| Dev | 2026-11-25 |");
  });

  it("counts the weeks and courses picks need", () => {
    expect(weeksNeeded([])).toBe(1);
    expect(weeksNeeded([pick("a", "lab", 3), pick("b", "lab", 0)])).toBe(3);
    expect(borrowedWords([pick("a", "lab", 1)])).toBe("1 item copied from 1 course");
    expect(borrowedWords([pick("a", "lab", 1), pick("b", "lab", 1, "mobile")])).toBe("2 items copied from 2 courses");
  });
});
