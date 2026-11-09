/** The assistants a lecturer can choose in Settings, and the models offered for each (ADR 0005, ADR 0022, ADR 0027). */
export type AssistantProvider = "none" | "ollama" | "anthropic";

export interface AssistantModel {
  id: string;
  label: string;
}

/** Claude models offered in Settings, the default first. */
export const claudeModels: readonly AssistantModel[] = [
  { id: "claude-opus-5-5", label: "Claude Opus 5.5, the most careful (the default)" },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5, quicker and cheaper" },
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5, the quickest and cheapest" },
];

export const defaultClaudeModel = claudeModels[0].id;

/** A model Settings offers, or the default when the stored one is unknown (retired, or typed by hand). */
export const knownClaudeModel = (id: string | null | undefined): string => claudeModels.find((model) => model.id === id)?.id ?? defaultClaudeModel;

/** A model Ollama already has on this computer. */
export interface LocalModel {
  name: string;
  /** On disk, in bytes. */
  size: number;
}

/** The small model Studio offers to download when Ollama has none (ADR 0027). */
export const suggestedLocalModel = { name: "llama3.2:3b", label: "Llama 3.2 (about 2 GB)" } as const;

/** Ollama's models, smallest first: a lecturer's laptop answers quickest with the smallest. */
export const smallestFirst = (models: readonly LocalModel[]): LocalModel[] => [...models].sort((a, b) => a.size - b.size || a.name.localeCompare(b.name));

/** The model to use: the one chosen if Ollama still has it, otherwise the smallest it has, or "" when it has none. */
export const localModelFrom = (chosen: string | null | undefined, available: readonly LocalModel[]): string =>
  available.some((model) => model.name === chosen) ? (chosen as string) : (smallestFirst(available)[0]?.name ?? "");

/** "2.0 GB" for a model's size, as Settings shows it. */
export const sizeInWords = (bytes: number): string => (bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${Math.max(1, Math.round(bytes / 1e6))} MB`);
