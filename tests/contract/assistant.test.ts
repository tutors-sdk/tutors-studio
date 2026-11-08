import { describe, expect, it } from "vitest";
import type { AssistantPort } from "../../src/application/ports/assistant.ts";
import { noAssistant } from "../../src/adapters/assistant/none/none-assistant.ts";

/** AssistantPort's contract (ADR 0005, 0009): rules every adapter keeps, whatever model is behind it. */
function assistantContract(name: string, assistant: AssistantPort) {
  describe(`AssistantPort contract: ${name}`, () => {
    const finding = { rule: "V002", severity: "error" as const, path: "Week 3", message: "won't appear" };

    it("every suggestion carries evidence and a confidence between 0 and 1", async () => {
      for (const s of await assistant.suggest("title", { file: "Week07.pdf" })) {
        expect(s.evidence.length).toBeGreaterThan(0);
        expect(s.confidence).toBeGreaterThanOrEqual(0);
        expect(s.confidence).toBeLessThanOrEqual(1);
      }
    });

    it("draft never writes: it returns a plan or nothing", async () => {
      const plan = await assistant.draft("lab-steps", "Six steps on CSS grid");
      if (plan !== null) expect(plan.ops.length).toBeGreaterThan(0);
    });

    it("explain and review return text, and capabilities say whether content leaves the machine", async () => {
      expect(typeof (await assistant.explain(finding))).toBe("string");
      expect(Array.isArray(await assistant.review([finding]))).toBe(true);
      expect(typeof assistant.capabilities().local).toBe("boolean");
    });
  });
}

assistantContract("assistant/none", noAssistant);

it("the none adapter offers nothing and sends nothing anywhere", async () => {
  expect(noAssistant.capabilities()).toEqual({ streaming: false, maxContext: 0, local: true, modelId: null });
  expect(await noAssistant.suggest("title", {})).toEqual([]);
  expect(await noAssistant.draft("note", "x")).toBeNull();
});
