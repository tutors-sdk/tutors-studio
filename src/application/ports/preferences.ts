import type { Appearance } from "../../domain/appearance.ts";
import type { AssistantProvider, LocalModel } from "../../domain/assistant.ts";

/** Driving port: the lecturer's Settings screen, and what other use cases read from it. */
export interface PreferencesPort {
  appearance(): Promise<Appearance>;
  /** Advanced mode (ADR 0024). */
  advanced(): Promise<boolean>;
  setAdvanced(on: boolean): Promise<void>;
  /** Whether the lecturer has hidden the companion (ADR 0015). */
  companionHidden(): Promise<boolean>;
  setCompanionHidden(hidden: boolean): Promise<void>;
  setAppearance(appearance: Appearance): Promise<void>;
  /**
   * The assistant chosen in Settings, its model, and whether Claude's API key is in the keychain (ADR 0022). For
   * a model on this computer, the one chosen if Ollama still has it, else its smallest, else "" (ADR 0028).
   */
  assistant(): Promise<{ provider: AssistantProvider; model: string; keySet: boolean }>;
  setAssistant(provider: AssistantProvider, model: string): Promise<void>;
  /** The models Ollama has on this computer, smallest first, or null when it isn't running (ADR 0028). */
  localModels(): Promise<LocalModel[] | null>;
  /** Downloads a model into Ollama and chooses it. Throws AssistantUnavailable with the reason. */
  downloadLocalModel(name: string): Promise<void>;
  /** The assistant's API key from the keychain, for the assistant adapter only; never shown in Settings. */
  assistantKey(): Promise<string | null>;
  /** Puts the key in the keychain; an empty key removes it. */
  setAssistantKey(key: string): Promise<void>;
  /** Whether the lecturer allowed a remote assistant to read this course (ADR 0006). */
  optedIn(course: string): Promise<boolean>;
  setOptIn(course: string, allowed: boolean): Promise<void>;
}
