import { describe, expect, it } from "vitest";
import { countOne, countedEvents, readCounts, usageLines, usageReport } from "../../src/domain/usage.ts";

describe("usage counts", () => {
  it("counts each publish, save, accepted change, Git hand-off and assistant proposal", () => {
    let counts = {};
    for (const name of ["publish.done", "course.saved", "website.saved", "plan.applied", "handoff.pushed", "assistant.drafted", "assistant.suggested", "plan.applied"])
      counts = countOne(counts, name);
    expect(counts).toEqual({ "publish.done": 1, "course.saved": 1, "website.saved": 1, "plan.applied": 2, "handoff.pushed": 1, "assistant.drafted": 1, "assistant.suggested": 1 });
  });

  it("never counts failures, checks or names it doesn't know", () => {
    const counts = {};
    for (const name of ["publish.failed", "website.failed", "handoff.failed", "plan.rolled-back", "course.validated", "constructor", "__proto__"])
      expect(countOne(counts, name)).toBe(counts);
  });

  it("drops anything in the store that isn't a counted name with a whole number", () => {
    expect(readCounts({ "plan.applied": 3, "course.saved": -1, "publish.done": 1.5, "my-course/secret.md": 4, "handoff.pushed": "2" })).toEqual({ "plan.applied": 3 });
    expect(readCounts(null)).toEqual({});
  });

  it("shows every counted event in Settings' words, zero included", () => {
    const lines = usageLines({ "plan.applied": 2 });
    expect(lines).toHaveLength(Object.keys(countedEvents).length);
    expect(lines.find((line) => line.words === "Changes accepted")?.count).toBe(2);
    expect(lines.find((line) => line.words === "Courses published")?.count).toBe(0);
  });

  it("reports only the version and the counts", () => {
    expect(JSON.parse(usageReport({ "plan.applied": 2, "my-course": 1 } as Record<string, number>, "0.1.0"))).toEqual({ studio: "0.1.0", counts: { "plan.applied": 2 } });
  });
});
