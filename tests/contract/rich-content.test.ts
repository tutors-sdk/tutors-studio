import { describe, expect, it } from "vitest";
import { mermaidDiagrams } from "../../src/adapters/diagrams/mermaid/mermaid-diagrams.ts";
import { marpSlides } from "../../src/adapters/slides/marp/marp-slides.ts";

/** DiagramPort and SlidesPort contracts (ADR 0009), run against the Mermaid and Marp adapters under Node. */
describe("DiagramPort contract: mermaid", () => {
  it("says a diagram draws, where a broken one stopped, and when its first line names no diagram type", async () => {
    expect(await mermaidDiagrams.check("flowchart LR\n  A --> B")).toEqual({ draws: true });
    expect(await mermaidDiagrams.check("flowchart LR\n  A --> B\n  B[oops --> C")).toEqual({ draws: false, line: 3 });
    expect(await mermaidDiagrams.check("flowhcart TD\n  A --> B")).toEqual({ draws: false, unknownType: true });
  });

  it("never calls a diagram broken when it can't tell, and draws nothing without a browser", async () => {
    expect(await mermaidDiagrams.check("classDiagram\n  class A")).not.toEqual(expect.objectContaining({ draws: false }));
    expect(await mermaidDiagrams.draw("flowchart LR\n  A --> B")).toEqual({ ok: false });
  });
});

describe("SlidesPort contract: marp", () => {
  it("renders one fragment per slide, with the theme's CSS", () => {
    const deck = marpSlides.render("---\nmarp: true\ntheme: gaia\n---\n\n# One\n\n---\n\n## Two\n");
    expect(deck.slides).toHaveLength(2);
    expect(deck.slides[0]).toContain("One");
    expect(deck.slides[1]).toContain("Two");
    expect(deck.css).toContain("gaia");
  });

  it("adds no script of its own", () => {
    expect(marpSlides.render("# Only").slides.join("")).not.toContain("<script");
  });
});
