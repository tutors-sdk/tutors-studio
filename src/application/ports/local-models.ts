import type { LocalModel } from "../../domain/assistant.ts";

/** Driven port: the models a model runner on this computer has, for Settings (ADR 0027). Ollama in the app. */
export interface LocalModelsPort {
  /** The models it has, or null when it isn't running on this computer. */
  models(): Promise<LocalModel[] | null>;
  /** Downloads a model; resolves once it can answer. Throws AssistantUnavailable with the reason in the lecturer's words. */
  download(name: string): Promise<void>;
}
