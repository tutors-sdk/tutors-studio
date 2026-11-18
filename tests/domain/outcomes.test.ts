import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { BLOOM_LEVELS, coverage, nextOutcomeId, outcomeProblem, outcomesOfPage, outcomesYaml, pageWithOutcomes, parseOutcomes, type Outcome } from "../../src/domain/outcomes.ts";

const lo = (id: string, level: Outcome["level"] = "Apply"): Outcome => ({ id, text: `Students can do ${id}`, level });

describe("outcomes.yaml", () => {
  it("reads back what it writes, whatever the sentence holds", () => {
    fc.assert(
      fc.property(fc.array(fc.tuple(fc.string(), fc.constantFrom(...BLOOM_LEVELS)), { maxLength: 6 }), (entries) => {
        const outcomes = entries.map(([text, level], index) => ({ id: `LO${index + 1}`, text: `Students can ${text}`, level }));
        expect(parseOutcomes(outcomesYaml(outcomes))).toEqual(outcomes);
      }),
    );
  });

  it("leaves out an entry with a level that isn't Bloom's", () => {
    expect(parseOutcomes("outcomes:\n  - id: LO1\n    level: Juggle\n    text: Students can juggle\n")).toEqual([]);
  });

  it("never reuses an id", () => {
    expect(nextOutcomeId([lo("LO1"), lo("LO4")])).toBe("LO5");
    expect(nextOutcomeId([])).toBe("LO1");
  });

  it("asks for a sentence that says what students can do", () => {
    expect(outcomeProblem("Forms", "Apply")).toMatch(/starting "Students can"/);
    expect(outcomeProblem("Students can", "Apply")).not.toBeNull();
    expect(outcomeProblem("Students can build a form", "Juggle")).toMatch(/Choose one of the levels/);
    expect(outcomeProblem("Students  can build a form", "Apply")).toBeNull();
  });
});

describe("the outcomes line on a page", () => {
  it("adds front matter to a page with none, and takes it away again", () => {
    const page = "# Forms\n\nBody.\n";
    const tagged = pageWithOutcomes(page, ["LO1", "LO2"]);
    expect(tagged).toBe("---\noutcomes: [LO1, LO2]\n---\n# Forms\n\nBody.\n");
    expect(outcomesOfPage(tagged)).toEqual(["LO1", "LO2"]);
    expect(pageWithOutcomes(tagged, [])).toBe(page);
  });

  it("keeps every other front matter line as written", () => {
    const page = "---\nicon:\n  type: fluent-color:book-24\n---\n\n# Week 1\n";
    const tagged = pageWithOutcomes(page, ["LO3"]);
    expect(tagged).toBe("---\nicon:\n  type: fluent-color:book-24\noutcomes: [LO3]\n---\n\n# Week 1\n");
    expect(pageWithOutcomes(pageWithOutcomes(tagged, ["LO1"]), [])).toBe(page);
  });
});

describe("the coverage map", () => {
  const weeks = [
    { path: "w1", title: "Week 1", items: [{ path: "w1/talk", kind: "talk", outcomes: ["LO1"] }] },
    { path: "w2", title: "Week 2", items: [{ path: "w2/lab", kind: "lab", outcomes: ["LO1", "LO9"] }] },
    { path: "w3", title: "Week 3", items: [{ path: "w3/quiz", kind: "quiz", outcomes: [] }] },
  ];

  it("is absent for a course with no outcomes", () => expect(coverage([], weeks)).toBeNull());

  it("counts a lecture as taught, a lab as practised and a quiz as assessed, week by week", () => {
    const map = coverage([lo("LO1"), lo("LO2")], weeks)!;
    expect(map.rows[0].cells).toEqual([["taught"], ["practised"], []]);
    expect(map.rows[0].flags).toEqual([]);
    expect(map.rows[1].flags).toEqual(["No item serves it yet"]);
    expect(map.weeks.map((week) => week.flag)).toEqual([null, null, "Nothing tagged"]);
    expect(map.unknown).toEqual([{ id: "LO9", items: ["w2/lab"] }]);
  });
});
