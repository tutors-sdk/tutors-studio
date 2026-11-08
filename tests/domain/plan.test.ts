import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { checkPlan, isSafePath, type Plan } from "../../src/domain/plan.ts";

const plan = (ops: Plan["ops"]): Plan => ({ id: "p", summary: "s", ops });

describe("plans", () => {
  it("a safe path is relative, with no .., no empty segments, no backslashes and no drive", () => {
    for (const ok of ["course.md", "topic-01/talk-01/slides.pdf", "Week 3"]) expect(isSafePath(ok)).toBe(true);
    for (const bad of ["", "/etc/passwd", "../x", "a/../b", "a//b", "a/./b", "C:/x", "a\\b", "a/"]) expect(isSafePath(bad)).toBe(false);
  });

  it("an empty plan, an unsafe path, two ops on one target, and a move onto itself are each refused", () => {
    expect(checkPlan(plan([]))).toEqual([{ kind: "empty" }]);
    expect(checkPlan(plan([{ op: "move", from: "../a", to: "b" }]))).toEqual([{ kind: "unsafe-path", path: "../a" }]);
    expect(checkPlan(plan([{ op: "move", from: "a", to: "a" }]))).toEqual([{ kind: "move-onto-itself", path: "a" }]);
    expect(
      checkPlan(
        plan([
          { op: "write", path: "x.md", content: new Uint8Array() },
          { op: "move", from: "y.md", to: "x.md" },
        ]),
      ),
    ).toEqual([{ kind: "same-target", path: "x.md" }]);
  });

  it("property: any path with a .. segment is never safe, wherever it sits", () => {
    const segment = fc.stringMatching(/^[a-z0-9-]{1,8}$/);
    fc.assert(
      fc.property(fc.array(segment, { maxLength: 4 }), fc.array(segment, { maxLength: 4 }), (before, after) => {
        expect(isSafePath([...before, "..", ...after].join("/"))).toBe(false);
      }),
    );
  });

  it("property: a plan of distinct safe moves is accepted", () => {
    const name = fc.stringMatching(/^[a-z][a-z0-9-]{0,8}$/);
    fc.assert(
      fc.property(fc.uniqueArray(fc.tuple(name, name), { selector: ([, to]) => to, minLength: 1, maxLength: 6 }), (pairs) => {
        const ops = pairs.filter(([from, to]) => from !== to).map(([from, to]) => ({ op: "move" as const, from: `src/${from}`, to: `dst/${to}` }));
        fc.pre(ops.length > 0);
        expect(checkPlan(plan(ops))).toEqual([]);
      }),
    );
  });
});
