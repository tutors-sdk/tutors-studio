import { describe, expect, it } from "vitest";
import { codeLanguage } from "../../src/domain/markdown-blocks.ts";

describe("codeLanguage", () => {
  it("spells out common short names", () => {
    expect(codeLanguage("JS")).toBe("javascript");
    expect(codeLanguage(" py ")).toBe("python");
    expect(codeLanguage("yml")).toBe("yaml");
  });
  it("keeps any other name, lower case without spaces", () => {
    expect(codeLanguage("Visual Basic")).toBe("visual-basic");
    expect(codeLanguage("")).toBe("");
  });
});
