import type { Appearance } from "../../domain/appearance.ts";
import type { EnvVar } from "../../domain/environment.ts";
import type { AssistantProvider, LocalModel } from "../../domain/assistant.ts";

/** One variable as Settings shows it: a secret's value is never read back, only whether it is set. */
export type EnvSetting = EnvVar & ({ secret: false; value: string } | { secret: true; isSet: boolean });

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
  environment(): Promise<EnvSetting[]>;
  /** Sets one variable; a secret goes to the keychain. An empty value clears it. */
  setVariable(name: string, value: string): Promise<void>;
  /** What the Tutors reader on this computer gets, secrets included. */
  readerEnvironment(): Promise<Record<string, string>>;
  /**
   * The assistant chosen in Settings, its model, and whether Claude's API key is in the keychain (ADR 0022). For
   * a model on this computer, the one chosen if Ollama still has it, else its smallest, else "" (ADR 0027).
   */
  assistant(): Promise<{ provider: AssistantProvider; model: string; keySet: boolean }>;
  setAssistant(provider: AssistantProvider, model: string): Promise<void>;
  /** The models Ollama has on this computer, smallest first, or null when it isn't running (ADR 0027). */
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
