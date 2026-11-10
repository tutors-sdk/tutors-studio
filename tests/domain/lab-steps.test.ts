import { describe, expect, it } from "vitest";
import { renumbered, steppedOrder, stepsOf, withHeading, withPicture } from "../../src/domain/lab-steps.ts";

describe("a lab's steps", () => {
  it("reads only numbered pages, in file-name order, with titles from their names", () => {
    expect(stepsOf(["02.CSS-grid.md", "lab.png", "01.Setup.md", "notes.md"])).toEqual([
      { file: "01.Setup.md", number: 1, title: "Setup" },
      { file: "02.CSS-grid.md", number: 2, title: "CSS grid" },
    ]);
  });

  it("renumbers in place when no step is in another's way", () => {
    const steps = stepsOf(["01.Setup.md", "02.Grid.md"]);
    expect(renumbered("lab", steppedOrder(steps, "02.Grid.md", -1)!, 1)).toEqual([
      { op: "move", from: "lab/02.Grid.md", to: "lab/01.Grid.md" },
      { op: "move", from: "lab/01.Setup.md", to: "lab/02.Setup.md" },
    ]);
  });

  it("goes through waiting names when two steps share a title", () => {
    const steps = stepsOf(["01.Try.md", "02.Try.md", "03.End.md"]);
    const ops = renumbered("lab", [steps[2], steps[0], steps[1]], 1);
    expect(ops.slice(0, 3).every((op) => op.op === "move" && op.to.endsWith(".moving"))).toBe(true);
    expect(ops.slice(3).map((op) => (op.op === "move" ? op.to : ""))).toEqual(["lab/01.End.md", "lab/02.Try.md", "lab/03.Try.md"]);
  });

  it("won't step past either end", () => {
    const steps = stepsOf(["01.Setup.md", "02.Grid.md"]);
    expect(steppedOrder(steps, "01.Setup.md", -1)).toBeNull();
    expect(steppedOrder(steps, "02.Grid.md", 1)).toBeNull();
  });

  it("sets a step's heading and adds a picture at its end", () => {
    expect(withHeading("# Grid\n\nDo this.\n", "CSS grid")).toBe("# CSS grid\n\nDo this.\n");
    expect(withHeading("Do this.\n", "CSS grid")).toBe("# CSS grid\n\nDo this.\n");
    expect(withPicture("# Grid\n\nDo this.\n\n", "grid", "img/grid.png")).toBe("# Grid\n\nDo this.\n\n![grid](img/grid.png)\n");
  });
});
