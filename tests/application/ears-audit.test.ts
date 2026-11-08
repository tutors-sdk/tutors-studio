import { expect, it } from "vitest";
import { audit, nextId, parseFeature, parseRegister } from "../../scripts/ears-audit.ts";

const register = parseRegister(
  "r.md",
  "| Id | Pattern | Requirement |\n|---|---|---|\n| STU-0001 | event | When a lecturer opens a course, the Studio shall show it. |\n| ~~STU-0002~~ | ubiquitous | The Studio shall be retired. |\n",
);
const feature = (tags: string, text = "When a lecturer opens a course, the Studio shall show it.") => parseFeature("f.feature", `Feature: x\n  ${tags}\n  Rule: ${text}\n`);
const bound = 'Rule("When a lecturer opens a course, the Studio shall show it.", ...)';

it("parses the register, struck-through ids included, and finds the next id", () => {
  expect(register.map((e) => e.id)).toEqual(["STU-0001", "STU-0002"]);
  expect(nextId(register)).toBe("STU-0003");
  expect(nextId([])).toBe("STU-0001");
});

it("passes a register entry with a matching, tagged, bound Rule", () => {
  const rules = [...feature("@stu-0001 @ears-event"), ...feature("@stu-0002 @ears-ubiquitous", "The Studio shall be retired.")];
  expect(audit(register, rules, `${bound} Rule("The Studio shall be retired.", ...)`)).toEqual([]);
});

it("names a missing Rule, a missing tag, a wrong tag, differing words and an unbound Rule", () => {
  expect(audit(register.slice(0, 1), [], "")).toEqual(["r.md: STU-0001 has no Rule in spec/features"]);
  expect(audit([], feature("@ears-event"), bound)).toEqual(["f.feature:3: Rule has no @stu-NNNN tag"]);
  expect(audit(register.slice(0, 1), feature("@stu-0001 @ears-state"), bound)).toEqual(["f.feature:3: STU-0001 should be tagged @ears-event"]);
  expect(audit(register.slice(0, 1), feature("@stu-0001 @ears-event", "When a lecturer opens a course, the Studio shall list it."), "")).toEqual([
    "f.feature:3: STU-0001's wording differs from the register",
    "f.feature:3: STU-0001 is not bound by any steps file",
  ]);
  expect(audit([], feature("@stu-0009 @ears-event"), bound)).toEqual(["f.feature:3: STU-0009 is not in the register"]);
});

it("checks each register sentence's pattern and its single shall", () => {
  const bad = parseRegister(
    "r.md",
    "| STU-0003 | state | If it breaks, then the Studio shall say so and shall stop. |\n| STU-0004 | sometimes | The Studio shall x. |\n| STU-0004 | ubiquitous | The Studio shall x. |\n",
  );
  const problems = audit(bad, [], "");
  expect(problems).toContain("r.md: STU-0003 is marked state but its wording reads @ears-unwanted");
  expect(problems).toContain('r.md: STU-0003 must say "shall" exactly once');
  expect(problems).toContain('r.md: STU-0004 has an unknown pattern "sometimes"');
  expect(problems).toContain("r.md: STU-0004 is listed twice");
});
