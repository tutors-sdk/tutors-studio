import Anthropic from "@anthropic-ai/sdk";
import { AssistantUnavailable, type AskContext, type AssistantPort } from "../../../application/ports/assistant.ts";
import type { Finding } from "../../../domain/finding.ts";

/** What Studio tells Claude it is for. Fixed text, so the prompt cache can reuse it across findings. */
const SYSTEM = [
  "You help a university lecturer who is not a developer get their course ready to publish with Tutors.",
  "Tutors reads a course folder: each folder's name says what kind of thing it is (topic-, talk-, lab-, note- and so on) and folders it can't read are left out of the published course.",
  "You are given one problem a checker found. Its message is correct and is the authority; don't contradict it or add rules of your own.",
  "Explain it in two or three short, plain sentences: what students would miss, and the one thing to do about it.",
  "Write for the lecturer, in British English, with no headings, lists, code or Markdown.",
].join(" ");

/** For a question the lecturer typed to the companion. Fixed text, cached like SYSTEM. */
const ASK_SYSTEM = [
  "You are the helper inside Tutors Studio, for a university lecturer who is not a developer.",
  "Studio shows their course week by week, checks it, and publishes it. Lecturers add material by dropping files on a week; changes are only made after they accept a plan.",
  "You are given their question, the screen they are on, and the checker's sentences about their course. The checker is the authority; don't contradict it or invent rules.",
  "You cannot change the course or see its pages. Never claim to have done anything; say what the lecturer can do in Studio.",
  "Answer in at most four short, plain sentences, in British English, with no headings, lists, code or Markdown, and without mentioning files or folders unless they ask.",
].join(" ");

const describeQuestion = (question: string, context: AskContext) =>
  [
    `The lecturer's question: ${question}`,
    `Screen: ${context.where}`,
    `The checker says: ${context.problems.length === 0 ? "nothing is wrong" : context.problems.join(" | ")}`,
  ].join("\n");

const describe = (finding: Finding) =>
  [`Where: ${finding.path === "" ? "the course folder itself" : finding.path}`, `How serious: ${finding.severity}`, `The checker's message: ${finding.message}`].join("\n");

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

  async function ask(text: string, system = SYSTEM): Promise<string> {
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
    explain: (finding) => ask(describe(finding)),
    answer: (question, context) => ask(describeQuestion(question, context), ASK_SYSTEM),
    // Suggestions, drafts and reviews follow the companion (ADR 0015); until then Claude offers none.
    suggest: async () => [],
    draft: async () => null,
    review: async () => [],
  };
}
