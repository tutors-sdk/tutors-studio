import { describe, expect, it } from "vitest";
import { localModelFrom, sizeInWords, smallestFirst } from "../../src/domain/assistant.ts";

describe("models on this computer", () => {
  const models = [
    { name: "qwen3:8b", size: 5.2e9 },
    { name: "gemma3:1b", size: 8.15e8 },
    { name: "llama3.2:3b", size: 2.0e9 },
  ];
  it("puts the smallest first", () => expect(smallestFirst(models).map((model) => model.name)).toEqual(["gemma3:1b", "llama3.2:3b", "qwen3:8b"]));
  it("keeps the chosen model while Ollama has it, else falls back to the smallest, else nothing", () => {
    expect(localModelFrom("qwen3:8b", models)).toBe("qwen3:8b");
    expect(localModelFrom("claude-opus-5-5", models)).toBe("gemma3:1b");
    expect(localModelFrom(null, [])).toBe("");
  });
  it("says sizes the way Settings shows them", () => {
    expect(sizeInWords(2.019e9)).toBe("2.0 GB");
    expect(sizeInWords(8.15e8)).toBe("815 MB");
  });
});
