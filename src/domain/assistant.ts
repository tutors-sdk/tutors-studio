/** The assistants a lecturer can choose in Settings, and the Claude models offered (ADR 0005, ADR 0022). */
export type AssistantProvider = "none" | "anthropic";

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
