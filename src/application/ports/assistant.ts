import type { Finding } from "../../domain/finding.ts";
import type { Plan } from "../../domain/plan.ts";

export interface AssistantCapabilities {
  streaming: boolean;
  maxContext: number;
  /** False when content leaves the machine: such an adapter needs a per-course opt-in first (ADR 0006). */
  local: boolean;
  modelId: string | null;
}

export interface Suggestion {
  value: string;
  confidence: number;
  /** What the suggestion was based on, so the UI can show why. Never empty. */
  evidence: string[];
}

/** What the assistant may know when the lecturer asks it something: the screen and the checker's sentences, never a page's content. */
export interface AskContext {
  /** The screen or week the lecturer is on, as a title. */
  where: string;
  /** The checker's own sentences about this course. */
  problems: string[];
}

export type SuggestTask = "title" | "icon" | "summary" | "order";
export type DraftKind = "note" | "lab-steps" | "handbook" | "calendar-row";

/**
 * Driven port: a model that helps the lecturer (ADR 0005). Ollama, Claude, ChatGPT, Gemini or none.
 * No method writes: draft returns a plan, which goes through the same accept-then-apply gate as a drop.
 */
export interface AssistantPort {
  capabilities(): AssistantCapabilities;
  explain(finding: Finding): Promise<string>;
  /** Answers a question the lecturer typed; "" when no assistant is bound. Writes nothing (ADR 0023). */
  answer(question: string, context: AskContext): Promise<string>;
  suggest(task: SuggestTask, context: Record<string, string>): Promise<Suggestion[]>;
  draft(kind: DraftKind, brief: string): Promise<Plan | null>;
  review(findings: readonly Finding[]): Promise<string[]>;
}

/** Why a chosen assistant couldn't answer, in the lecturer's words. Callers fall back to the rule's own message and show this beside it. */
export class AssistantUnavailable extends Error {}
