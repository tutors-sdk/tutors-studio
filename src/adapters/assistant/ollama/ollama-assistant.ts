import { AssistantUnavailable, type AssistantPort } from "../../../application/ports/assistant.ts";
import type { LocalModelsPort } from "../../../application/ports/local-models.ts";
import {
  ASK_SYSTEM,
  DRAFT_LAB_SYSTEM,
  EXPLAIN_SYSTEM,
  ORDER_SYSTEM,
  describeFinding,
  describeQuestion,
  describeWeek,
  orderSuggestions,
} from "../../../application/assistant-prompts.ts";
import type { LocalModel } from "../../../domain/assistant.ts";

/** Where Ollama listens on this computer, and the only place this adapter sends anything (ADR 0028). */
export const OLLAMA = "http://127.0.0.1:11434";

const NOT_RUNNING = "Studio couldn't reach Ollama on this computer. Open the Ollama app (or run ollama serve), then try again.";

export interface OllamaOptions {
  model: string;
  /** The app passes Tauri's HTTP client, which Ollama answers whatever the window's origin; tests pass Ollama in memory. */
  fetch?: typeof fetch;
}

/** Ollama's HTTP API, with each failure turned into a lecturer's sentence. */
async function call(send: typeof fetch, path: string, body?: unknown): Promise<unknown> {
  let response: Response;
  try {
    response = await send(
      `${OLLAMA}${path}`,
      body === undefined ? { method: "GET" } : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) },
    );
  } catch {
    throw new AssistantUnavailable(NOT_RUNNING);
  }
  if (response.status === 404) throw new AssistantUnavailable("Ollama doesn't have the model chosen in Settings. Choose another there, or download one.");
  if (!response.ok) throw new AssistantUnavailable(`Ollama answered with an error (${response.status}). Try again, or choose a smaller model in Settings.`);
  return response.json();
}

/**
 * A model on this computer, through Ollama (ADR 0028). Nothing leaves the machine, so it needs no per-course
 * opt-in (ADR 0006); like every assistant it reads only what a method is given and writes nothing.
 */
export function ollamaAssistant(options: OllamaOptions): AssistantPort {
  const send = options.fetch ?? fetch;
  async function ask(text: string, system: string): Promise<string> {
    const reply = (await call(send, "/api/chat", {
      model: options.model,
      stream: false,
      // Plain explanations, not creative writing.
      options: { temperature: 0.2 },
      messages: [
        { role: "system", content: system },
        { role: "user", content: text },
      ],
    })) as { message?: { content?: string } };
    const answer = (reply.message?.content ?? "").trim();
    if (answer === "") throw new AssistantUnavailable("The model on this computer gave no answer. Try again, or choose another model in Settings.");
    return answer;
  }
  return {
    capabilities: () => ({ streaming: false, maxContext: 8_192, local: true, modelId: options.model }),
    explain: (finding) => ask(describeFinding(finding), EXPLAIN_SYSTEM),
    answer: (question, context) => ask(describeQuestion(question, context), ASK_SYSTEM),
    // A week's order and titles, and a lab drafted from notes (ADR 0036); other tasks and reviews offer none yet.
    suggest: async (task, context) => (task === "order" ? orderSuggestions(await ask(describeWeek(context), ORDER_SYSTEM), context, "the model on this computer") : []),
    draft: async (kind, brief) => (kind === "lab-steps" ? ask(brief, DRAFT_LAB_SYSTEM) : ""),
    review: async () => [],
  };
}

/** The models Ollama has on this computer, and downloading another (ADR 0028). */
export function ollamaModels(options: { fetch?: typeof fetch } = {}): LocalModelsPort {
  const send = options.fetch ?? fetch;
  return {
    async models(): Promise<LocalModel[] | null> {
      try {
        const tags = (await call(send, "/api/tags")) as { models?: { name: string; size: number }[] };
        return (tags.models ?? []).map(({ name, size }) => ({ name, size }));
      } catch {
        return null;
      }
    },
    async download(name: string) {
      const outcome = (await call(send, "/api/pull", { model: name, stream: false })) as { status?: string; error?: string };
      if (outcome.status !== "success")
        throw new AssistantUnavailable(`Ollama couldn't download ${name}${outcome.error ? ` (${outcome.error})` : ""}. Check this computer's internet connection and free space.`);
    },
  };
}
