import Anthropic from "@anthropic-ai/sdk";
import { AssistantUnavailable, type AssistantPort } from "../../../application/ports/assistant.ts";
import { ASK_SYSTEM, EXPLAIN_SYSTEM, describeFinding, describeQuestion } from "../../../application/assistant-prompts.ts";

/** The lecturer-facing reason for an error from Claude's API; the caller shows the rule's own message beside it. */
function unavailable(error: unknown): AssistantUnavailable {
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError)
    return new AssistantUnavailable("Claude refused the API key. Make a new one in the Claude Console under API keys and paste it in Settings.");
  if (error instanceof Anthropic.NotFoundError) return new AssistantUnavailable("Claude doesn't offer the model chosen in Settings to this key. Choose another model there.");
  if (error instanceof Anthropic.RateLimitError) return new AssistantUnavailable("Claude is busy for this key right now. Try again in a minute.");
  if (error instanceof Anthropic.APIConnectionError) return new AssistantUnavailable("Studio couldn't reach Claude. Check this computer's internet connection.");
  if (error instanceof Anthropic.APIError) return new AssistantUnavailable(`Claude answered with an error (${error.status ?? "no status"}). Try again later.`);
  return new AssistantUnavailable("Claude couldn't answer just now. Try again later.");
}

export interface AnthropicOptions {
  apiKey: string;
  model: string;
  /** Tests pass Claude's API in memory; the app uses the WebView's fetch. */
  fetch?: typeof fetch;
}

/**
 * Claude, through Anthropic's own SDK, called straight from the WebView with the lecturer's key from the
 * keychain (ADR 0022). It reads only what a method is given; which course it may read is decided before
 * it is called (ADR 0006).
 */
export function anthropicAssistant(options: AnthropicOptions): AssistantPort {
  // A desktop app holding the lecturer's own key is the case the browser flag exists for: no one else sees the key.
  const client = new Anthropic({ apiKey: options.apiKey, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 60_000, ...(options.fetch ? { fetch: options.fetch } : {}) });

  async function ask(text: string, system = EXPLAIN_SYSTEM): Promise<string> {
    try {
      const response = await client.beta.messages.create({
        model: options.model,
        max_tokens: 2048,
        // Short explanations, not hard reasoning; Opus 5.5 always thinks, so effort is the dial.
        output_config: { effort: "low" },
        // If a safety classifier declines, Anthropic retries on its recommended model instead of failing.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: text }],
      });
      if (response.stop_reason === "refusal") throw new AssistantUnavailable("Claude declined to explain this one.");
      return response.content
        .flatMap((block) => (block.type === "text" ? [block.text] : []))
        .join("")
        .trim();
    } catch (error) {
      throw error instanceof AssistantUnavailable ? error : unavailable(error);
    }
  }

  return {
    capabilities: () => ({ streaming: false, maxContext: 1_000_000, local: false, modelId: options.model }),
    explain: (finding) => ask(describeFinding(finding)),
    answer: (question, context) => ask(describeQuestion(question, context), ASK_SYSTEM),
    // Suggestions, drafts and reviews follow the companion (ADR 0015); until then Claude offers none.
    suggest: async () => [],
    draft: async () => null,
    review: async () => [],
  };
}
