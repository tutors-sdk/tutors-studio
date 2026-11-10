import type { Finding } from "../../domain/finding.ts";
import { knownClaudeModel } from "../../domain/assistant.ts";
import { AssistantUnavailable, type AssistantCapabilities, type AssistantPort } from "../ports/assistant.ts";
import type { PreferencesPort } from "../ports/preferences.ts";

/** How Studio builds each assistant it can bind, given the lecturer's key and model. Named in main.ts and headless.ts. */
export interface AssistantProviders {
  anthropic: (options: { apiKey: string; model: string }) => AssistantPort;
  /** A model on this computer (ADR 0028); left out where there is none, as in the headless CLI. */
  ollama?: (options: { model: string }) => AssistantPort;
}

const NONE: AssistantCapabilities = { streaming: false, maxContext: 0, local: true, modelId: null };

/**
 * The assistant the lecturer chose in Settings, for one course, read again at every call so a change in
 * Settings applies at once. A remote assistant gets nothing from a course the lecturer hasn't allowed it
 * to read (ADR 0006); with no assistant chosen, every method answers nothing, as the none adapter does.
 */
export function chosenAssistant(deps: { preferences: PreferencesPort; course: string; providers: AssistantProviders }): AssistantPort {
  let capabilities = NONE;
  /** The bound assistant, or null for none. Throws AssistantUnavailable when one is chosen but can't be used here. */
  const bound = async (): Promise<AssistantPort | null> => {
    const choice = await deps.preferences.assistant();
    if (choice.provider === "none") {
      capabilities = NONE;
      return null;
    }
    if (choice.provider === "ollama") {
      if (deps.providers.ollama === undefined || choice.model === "")
        throw new AssistantUnavailable("No model on this computer is chosen yet. Choose one in Settings, under Assistant.");
      // Nothing leaves the computer, so no course needs the lecturer's permission first (ADR 0006).
      const local = deps.providers.ollama({ model: choice.model });
      capabilities = local.capabilities();
      return local;
    }
    const apiKey = await deps.preferences.assistantKey();
    if (apiKey === null) throw new AssistantUnavailable("Claude has no API key yet. Make one in the Claude Console under API keys and paste it in Settings.");
    const assistant = deps.providers.anthropic({ apiKey, model: knownClaudeModel(choice.model) });
    capabilities = assistant.capabilities();
    if (!capabilities.local && !(await deps.preferences.optedIn(deps.course)))
      throw new AssistantUnavailable("Claude can't read this course yet, so nothing was sent. Allow it on the Check and publish screen.");
    return assistant;
  };
  return {
    capabilities: () => capabilities,
    explain: async (finding: Finding) => (await bound())?.explain(finding) ?? "",
    answer: async (question, context) => (await bound())?.answer(question, context) ?? "",
    suggest: async (task, context) => (await bound())?.suggest(task, context) ?? [],
    draft: async (kind, brief) => (await bound())?.draft(kind, brief) ?? "",
    review: async (findings) => (await bound())?.review(findings) ?? [],
  };
}
