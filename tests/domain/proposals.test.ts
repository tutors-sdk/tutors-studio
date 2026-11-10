import { describe, expect, it } from "vitest";
import { draftedSteps, suggestedOrder } from "../../src/domain/proposals.ts";

describe("draftedSteps", () => {
  it("starts a step at each level-one heading and leaves out anything before the first", () => {
    expect(draftedSteps("Here is your lab:\n\n# One\n\nDo this.\n\n## Detail\n\nMore.\n# Two\nThen that.")).toEqual([
      { title: "One", body: "# One\n\nDo this.\n\n## Detail\n\nMore.\n" },
      { title: "Two", body: "# Two\nThen that.\n" },
    ]);
  });
  it("reads a draft wrapped in a code fence, and finds none in prose", () => {
    expect(draftedSteps("```markdown\n# Only\n\nText\n```").map((step) => step.title)).toEqual(["Only"]);
    expect(draftedSteps("I'd start with a grid.")).toEqual([]);
  });
});

describe("suggestedOrder", () => {
  const names = ["talk-01", "lab-01"];
  it("keeps only the names Studio sent, each once, in the order given", () => {
    const answer =
      '```json\n{"items":[{"name":"lab-01","title":" Grid  lab ","why":"Hands on."},{"name":"made-up","title":"X"},{"name":"lab-01","title":"Again"},{"name":"talk-01"}]}\n```';
    expect(suggestedOrder(answer, names)).toEqual([
      { name: "lab-01", title: "Grid lab", why: "Hands on." },
      { name: "talk-01", title: "", why: "" },
    ]);
  });
  it("reads a bare list, and refuses an answer that isn't one", () => {
    expect(suggestedOrder('[{"name":"talk-01","title":"Intro"}]', names)).toEqual([{ name: "talk-01", title: "Intro", why: "" }]);
    expect(suggestedOrder("Put the talk first.", names)).toBeNull();
    expect(suggestedOrder("{not json}", names)).toBeNull();
  });
});
