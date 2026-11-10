import { describe, expect, it } from "vitest";
import type { AssistantPort } from "../../src/application/ports/assistant.ts";
import { noAssistant } from "../../src/adapters/assistant/none/none-assistant.ts";
import { anthropicAssistant } from "../../src/adapters/assistant/anthropic/anthropic-assistant.ts";
import { AssistantUnavailable } from "../../src/application/ports/assistant.ts";
import { FakeClaude } from "../support/fake-claude.ts";
import { FakeOllama } from "../support/fake-ollama.ts";
import { ollamaAssistant, ollamaModels } from "../../src/adapters/assistant/ollama/ollama-assistant.ts";

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

    it("draft never writes: it answers markdown, or nothing", async () => {
      expect(typeof (await assistant.draft("lab-steps", "Six steps on CSS grid"))).toBe("string");
    });

    it("an order suggestion is only ever about an item it was given", async () => {
      const items = JSON.stringify([{ name: "talk-01", kind: "Talk", title: "Grid", page: "# Grid" }]);
      for (const s of await assistant.suggest("order", { week: "Week 1", items })) expect(s.for).toBe("talk-01");
    });

    it("explain and review return text, and capabilities say whether content leaves the machine", async () => {
      expect(typeof (await assistant.explain(finding))).toBe("string");
      expect(Array.isArray(await assistant.review([finding]))).toBe(true);
      expect(typeof assistant.capabilities().local).toBe("boolean");
    });
  });
}

assistantContract("assistant/none", noAssistant);
assistantContract("assistant/ollama", ollamaAssistant({ model: "llama3.2:3b", fetch: new FakeOllama([{ name: "llama3.2:3b", size: 2e9 }]).fetch }));
assistantContract("assistant/anthropic", anthropicAssistant({ apiKey: "sk-ant-good", model: "claude-opus-5-5", fetch: new FakeClaude().fetch }));

describe("the Claude adapter", () => {
  const finding = { rule: "V002", severity: "error" as const, path: "Week 3", message: 'The folder "Week 3" won\'t appear in your course.' };

  it("asks the chosen model at low effort with a fixed, cached system prompt and fallbacks on", async () => {
    const claude = new FakeClaude();
    await anthropicAssistant({ apiKey: "sk-ant-good", model: "claude-sonnet-5-5", fetch: claude.fetch }).explain(finding);
    const [request] = claude.requests;
    expect(request.url).toMatch(/^https:\/\/api\.anthropic\.com\/v1\/messages/);
    expect(request.body.model).toBe("claude-sonnet-5-5");
    expect(request.body.output_config?.effort).toBe("low");
    expect(request.body.fallbacks).toBe("default");
    expect(request.headers["anthropic-beta"]).toContain("server-side-fallback-2026-07-01");
    expect(request.body.messages[0].content).toContain(finding.message);
  });

  it("drafts a lab and suggests an order with their own prompts, sending only what it is given", async () => {
    const claude = new FakeClaude('{"items":[{"name":"talk-01","title":"Grid","why":"Clear."}]}');
    const assistant = anthropicAssistant({ apiKey: "sk-ant-good", model: "claude-opus-5-5", fetch: claude.fetch });
    const items = JSON.stringify([{ name: "talk-01", kind: "Talk", title: "Intro", page: "# Intro" }]);
    expect(await assistant.suggest("order", { week: "Week 1", items })).toEqual([{ value: "Grid", confidence: 0.5, evidence: ["Clear."], for: "talk-01" }]);
    expect(claude.requests[0].body.system?.[0].text).toMatch(/order students should meet them/);
    await assistant.draft("lab-steps", "My notes");
    expect(claude.requests[1].body.system?.[0].text).toMatch(/level-one heading/);
    expect(claude.requests[1].body.messages[0].content).toBe("My notes");
    expect(await assistant.suggest("icon", {})).toEqual([]);
    expect(claude.requests).toHaveLength(2);
  });

  it("turns a refusal and each API error into a lecturer's sentence", async () => {
    const reason = async (claude: FakeClaude, key = "sk-ant-good") =>
      anthropicAssistant({ apiKey: key, model: "claude-opus-5-5", fetch: claude.fetch })
        .explain(finding)
        .then(
          () => "",
          (error: unknown) => (error instanceof AssistantUnavailable ? error.message : `not lecturer-facing: ${String(error)}`),
        );
    expect(await reason(new FakeClaude(), "sk-ant-wrong")).toMatch(/refused the API key/);
    expect(await reason(new FakeClaude("", { status: 404 }))).toMatch(/doesn't offer the model/);
    expect(await reason(new FakeClaude("", { status: 400 }))).toMatch(/answered with an error \(400\)/);
    expect(await reason(new FakeClaude("", { stopReason: "refusal" }))).toMatch(/declined/);
  });
});

it("the none adapter offers nothing and sends nothing anywhere", async () => {
  expect(noAssistant.capabilities()).toEqual({ streaming: false, maxContext: 0, local: true, modelId: null });
  expect(await noAssistant.suggest("title", {})).toEqual([]);
  expect(await noAssistant.draft("note", "x")).toBe("");
});

describe("the Ollama adapter", () => {
  const finding = { rule: "V002", severity: "error" as const, path: "Week 3", message: 'The folder "Week 3" won\'t appear in your course.' };
  const reason = (ollama: FakeOllama, model = "llama3.2:3b") =>
    ollamaAssistant({ model, fetch: ollama.fetch })
      .explain(finding)
      .then(
        () => "",
        (error: unknown) => (error instanceof AssistantUnavailable ? error.message : `not lecturer-facing: ${String(error)}`),
      );

  it("asks Ollama on this computer, unstreamed, with the same system prompt Claude gets, and says nothing leaves", async () => {
    const ollama = new FakeOllama([{ name: "llama3.2:3b", size: 2e9 }]);
    const assistant = ollamaAssistant({ model: "llama3.2:3b", fetch: ollama.fetch });
    expect(assistant.capabilities()).toMatchObject({ local: true, modelId: "llama3.2:3b" });
    await assistant.explain(finding);
    const [request] = ollama.requests;
    expect(request.url).toBe("http://127.0.0.1:11434/api/chat");
    expect(request.body).toMatchObject({ model: "llama3.2:3b", stream: false });
    expect(request.body?.messages?.[0]).toMatchObject({ role: "system" });
    expect(request.body?.messages?.[0].content).toMatch(/British English/);
    expect(request.body?.messages?.[1].content).toContain(finding.message);
  });

  it("turns Ollama being closed, a missing model and an empty answer into a lecturer's sentence", async () => {
    expect(await reason(new FakeOllama([], { running: false }))).toMatch(/couldn't reach Ollama/);
    expect(await reason(new FakeOllama([]))).toMatch(/doesn't have the model/);
    expect(await reason(new FakeOllama([{ name: "llama3.2:3b", size: 2e9 }], { answer: "  " }))).toMatch(/gave no answer/);
  });

  it("lists Ollama's models, says null when it isn't running, and downloads one", async () => {
    const ollama = new FakeOllama([{ name: "qwen3:8b", size: 5e9 }]);
    expect(await ollamaModels({ fetch: ollama.fetch }).models()).toEqual([{ name: "qwen3:8b", size: 5e9 }]);
    expect(await ollamaModels({ fetch: new FakeOllama([], { running: false }).fetch }).models()).toBeNull();
    await ollamaModels({ fetch: ollama.fetch }).download("llama3.2:3b");
    expect(ollama.models.map((model) => model.name)).toContain("llama3.2:3b");
  });
});
