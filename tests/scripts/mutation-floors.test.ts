import { describe, expect, it } from "vitest";
import { judge, scores, type Report } from "../../scripts/mutation-floors.ts";

const report: Report = {
  files: {
    "src/domain/plan.ts": { mutants: [{ status: "Killed" }, { status: "Timeout" }, { status: "Survived" }, { status: "CompileError" }] },
    "src\\domain\\term.ts": { mutants: [{ status: "NoCoverage" }, { status: "Ignored" }] },
    "src/application/use-cases/apply-plan.ts": { mutants: [{ status: "Killed" }, { status: "Killed" }, { status: "Killed" }] },
    "src/domainish/x.ts": { mutants: [{ status: "Survived" }] },
  },
};

describe("the nightly mutation floors", () => {
  it("scores each ring as Stryker does: detected over valid", () => {
    expect(scores(report, ["src/domain", "src/application", "src/ui"])).toEqual({ "src/domain": 50, "src/application": 100, "src/ui": 100 });
  });

  it("fails a ring below its floor, and only ever raises a floor", () => {
    expect(judge({ "src/domain": 60, "src/application": 90 }, { "src/domain": 50, "src/application": 97.5 })).toEqual({
      drops: ["src/domain: 50% is below its floor of 60%"],
      raised: { "src/domain": 60, "src/application": 97 },
    });
    expect(judge({ "src/domain": 50 }, { "src/domain": 50 }).drops).toEqual([]);
  });
});
