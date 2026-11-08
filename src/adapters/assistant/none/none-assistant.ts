import type { AssistantPort } from "../../../application/ports/assistant.ts";

/**
 * No assistant: a real adapter, not a missing one (ADR 0005). It returns nothing, so every use case runs
 * the same code path whether or not a model is bound, and the UI shows no assistant affordance.
 */
export const noAssistant: AssistantPort = {
  capabilities: () => ({ streaming: false, maxContext: 0, local: true, modelId: null }),
  explain: async () => "",
  suggest: async () => [],
  draft: async () => null,
  review: async () => [],
};
