import { readAppearance, type Appearance } from "../../domain/appearance.ts";
import { envContract, readerEnvironment } from "../../domain/environment.ts";
import type { EnvSetting, PreferencesPort } from "../ports/preferences.ts";
import type { SecretsPort } from "../ports/secrets.ts";
import type { SettingsPort } from "../ports/settings.ts";
import { knownClaudeModel, localModelFrom, smallestFirst, type AssistantProvider } from "../../domain/assistant.ts";
import type { LocalModelsPort } from "../ports/local-models.ts";

/** The keychain name of the Claude API key (ADR 0016). */
export const ASSISTANT_KEY = "anthropic-api-key";

/** The keychain name a secret variable lives under; the Netlify token keeps the name the Netlify adapter reads. */
export const secretNameOf = (name: string) => (name === "NETLIFY_AUTH_TOKEN" ? "netlify-token" : name);

/** Settings over the settings store and the keychain: secrets never touch the store (ADR 0016). */
export function createPreferences(deps: { settings: SettingsPort; secrets: SecretsPort; localModels?: LocalModelsPort }): PreferencesPort {
  const { settings, secrets } = deps;
  const localModels = async () => {
    const found = deps.localModels === undefined ? null : await deps.localModels.models();
    return found === null ? null : smallestFirst(found);
  };
  const known = (name: string) => {
    const variable = envContract.find((candidate) => candidate.name === name);
    if (variable === undefined) throw new Error(`${name} is not a Tutors environment variable`);
    return variable;
  };
  return {
    advanced: async () => (await settings.get("advanced")) === true,
    setAdvanced: (on: boolean) => settings.set("advanced", on),
    companionHidden: async () => (await settings.get("companionHidden")) === true,
    setCompanionHidden: (hidden: boolean) => settings.set("companionHidden", hidden),
    async appearance() {
      return readAppearance(await settings.get("appearance"));
    },
    async setAppearance(appearance: Appearance) {
      await settings.set("appearance", readAppearance(appearance));
    },
    async environment(): Promise<EnvSetting[]> {
      const values = await settings.get("environment");
      return Promise.all(
        envContract.map(async (variable): Promise<EnvSetting> =>
          variable.secret
            ? { ...variable, secret: true, isSet: ((await secrets.get(secretNameOf(variable.name))) ?? "") !== "" }
            : { ...variable, secret: false, value: values[variable.name] ?? variable.example },
        ),
      );
    },
    async setVariable(name: string, value: string) {
      const variable = known(name);
      const trimmed = value.trim();
      if (variable.secret) {
        await secrets.set(secretNameOf(name), trimmed);
        return;
      }
      const values = { ...(await settings.get("environment")) };
      if (trimmed === "") delete values[name];
      else values[name] = trimmed;
      await settings.set("environment", values);
    },
    async readerEnvironment() {
      const values: Record<string, string> = { ...(await settings.get("environment")) };
      for (const variable of envContract.filter((candidate) => candidate.secret)) {
        const secret = await secrets.get(secretNameOf(variable.name));
        if (secret) values[variable.name] = secret;
      }
      return readerEnvironment(values);
    },
    async assistant() {
      const stored = await settings.get("assistant");
      const provider: AssistantProvider = stored === "anthropic" || stored === "ollama" ? stored : "none";
      const chosen = await settings.get("assistantModel");
      const found = provider === "ollama" ? await localModels() : null;
      // With Ollama closed, keep the lecturer's choice, so the reason given is that Ollama is closed, not that no model is chosen.
      const model = provider !== "ollama" ? knownClaudeModel(chosen) : found === null ? (chosen ?? "") : localModelFrom(chosen, found);
      return { provider, model, keySet: ((await secrets.get(ASSISTANT_KEY)) ?? "") !== "" };
    },
    async setAssistant(provider: AssistantProvider, model: string) {
      await settings.set("assistant", provider);
      await settings.set("assistantModel", provider === "ollama" ? model.trim() : knownClaudeModel(model));
    },
    localModels,
    async downloadLocalModel(name: string) {
      if (deps.localModels === undefined) return;
      await deps.localModels.download(name);
      await settings.set("assistant", "ollama");
      await settings.set("assistantModel", name);
    },
    async assistantKey() {
      const key = (await secrets.get(ASSISTANT_KEY)) ?? "";
      return key === "" ? null : key;
    },
    async setAssistantKey(key: string) {
      await secrets.set(ASSISTANT_KEY, key.trim());
    },
    async optedIn(course: string) {
      return (await settings.get("remoteOptIn")).includes(course);
    },
    async setOptIn(course: string, allowed: boolean) {
      const others = (await settings.get("remoteOptIn")).filter((root) => root !== course);
      await settings.set("remoteOptIn", allowed ? [...others, course] : others);
    },
  };
}
