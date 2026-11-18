import { describe, expect, it } from "vitest";
import { hiddenIn, keptOnRollOver, mondayOf, readableDate, releasesIn, teachingWeek, termOf, termWords, withoutReleases, withRelease } from "../../src/domain/term.ts";

describe("the teaching week", () => {
  it("counts the start's week as 1 and before it as 0", () => {
    expect(teachingWeek("2027-01-25", "2027-01-24")).toBe(0);
    expect(teachingWeek("2027-01-25", "2027-01-25")).toBe(1);
    expect(teachingWeek("2027-01-25", "2027-01-31")).toBe(1);
    expect(teachingWeek("2027-01-25", "2027-02-01")).toBe(2);
  });

  it("reads a date the way a lecturer does and finds its Monday", () => {
    expect(readableDate("2027-02-02")).toBe("2 Feb 2027");
    expect(mondayOf("2027-09-15")).toBe("2027-09-13");
    expect(mondayOf("2027-09-13")).toBe("2027-09-13");
    expect(mondayOf("2027-09-19")).toBe("2027-09-13");
  });

  it("says which week it is, before, during and after teaching", () => {
    const weeks = [
      { path: "w1", title: "Week 1" },
      { path: "w2", title: "Week 2" },
    ];
    expect(termWords(termOf("2027-01-25", "2027-01-20", weeks, []))).toBe("Teaching starts on 25 Jan 2027.");
    expect(termWords(termOf("2027-01-25", "2027-02-02", weeks, []))).toBe("This is week 2 of the term: Week 2.");
    expect(termWords(termOf("2027-01-25", "2027-03-02", weeks, []))).toBe("The 2 weeks of teaching are over.");
  });

  it("finds what is hidden and which of it is due", () => {
    const term = termOf(
      "2027-01-25",
      "2027-02-08",
      [],
      [
        { path: "w3", title: "Week 3", hidden: true, release: "2027-02-08" },
        { path: "w4", title: "Week 4", hidden: true, release: "2027-02-15" },
        { path: "w5", title: "Week 5", hidden: true, release: null },
        { path: "w1", title: "Week 1", hidden: false, release: "2027-01-01" },
      ],
    );
    expect(term.hidden.map((place) => place.path)).toEqual(["w3", "w4", "w5"]);
    expect(term.due.map((place) => place.path)).toEqual(["w3"]);
  });
});

describe("release dates in properties.yaml", () => {
  it("reads the ignore list inline or as a block", () => {
    expect(hiddenIn("ignore: [w3, 'w4']\n")).toEqual(["w3", "w4"]);
    expect(hiddenIn("credits: Me\nignore:\n  - w3\n  - w4\nother: x\n")).toEqual(["w3", "w4"]);
    expect(hiddenIn("credits: Me\n")).toEqual([]);
  });

  it("adds, changes and takes away a date, keeping every other line", () => {
    const one = withRelease("credits: Me\nignore:\n  - w3\n", "w3", "2027-02-08");
    expect(one).toBe("credits: Me\nignore:\n  - w3\nrelease:\n  w3: 2027-02-08\n");
    expect(releasesIn(one)).toEqual({ w3: "2027-02-08" });
    const two = withRelease(one, "w4", "2027-02-15");
    expect(releasesIn(two)).toEqual({ w3: "2027-02-08", w4: "2027-02-15" });
    expect(withRelease(two, "w3", null)).toBe("credits: Me\nignore:\n  - w3\nrelease:\n  w4: 2027-02-15\n");
    expect(withoutReleases(two)).toBe("credits: Me\nignore:\n  - w3\n");
  });
});

describe("next year's copy", () => {
  it("leaves out built output, the bin, git and the computer's own files", () => {
    for (const path of ["json/", "html/index.html", ".git/HEAD", ".tutors-bin/x", "node_modules/", "w1/.DS_Store"]) expect(keptOnRollOver(path), path).toBe(false);
    for (const path of ["course.md", "w1/topic.md", "outcomes.yaml", "properties.yaml", "jsonish/notes.md"]) expect(keptOnRollOver(path), path).toBe(true);
  });
});
