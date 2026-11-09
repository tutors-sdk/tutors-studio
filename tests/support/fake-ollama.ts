import type { LocalModel } from "../../src/domain/assistant.ts";

/** One request Studio sent to Ollama, as Ollama received it. */
export interface OllamaRequest {
  url: string;
  method: string;
  body: { model?: string; stream?: boolean; messages?: { role: string; content: string }[] } | null;
}

/**
 * Ollama's HTTP API in memory, for the assistant tests: it lists the models it holds, answers chats with
 * fixed text, downloads by adding a model, and records every request. `running: false` refuses to connect,
 * as fetch does when nothing listens on the port.
 */
export class FakeOllama {
  readonly requests: OllamaRequest[] = [];
  constructor(
    public models: LocalModel[] = [],
    private readonly options: { running?: boolean; answer?: string } = {},
  ) {}

  fetch = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
    const url = String(input);
    const body = init.body === undefined ? null : (JSON.parse(String(init.body)) as OllamaRequest["body"]);
    this.requests.push({ url, method: init.method ?? "GET", body });
    if (this.options.running === false) throw new TypeError("fetch failed: connection refused");
    const json = (status: number, payload: unknown) => new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } });
    const path = new URL(url).pathname;
    if (path === "/api/tags") return json(200, { models: this.models.map((model) => ({ ...model, model: model.name, details: {} })) });
    if (path === "/api/pull") {
      this.models.push({ name: body!.model!, size: 2_019_393_189 });
      return json(200, { status: "success" });
    }
    if (path === "/api/chat") {
      if (!this.models.some((model) => model.name === body!.model)) return json(404, { error: `model "${body!.model}" not found, try pulling it first` });
      return json(200, {
        model: body!.model,
        message: { role: "assistant", content: this.options.answer ?? "Students won't see Week 3 until it is a week Tutors knows." },
        done: true,
      });
    }
    return json(404, { error: "not found" });
  };

  /** Every word sent, to check nothing from a course's pages went out. */
  sent = () => this.requests.map((request) => JSON.stringify(request.body)).join("\n");
}
