import { readAppearance, type Appearance } from "../../domain/appearance.ts";
import { envContract, readerEnvironment } from "../../domain/environment.ts";
import type { EnvSetting, PreferencesPort } from "../ports/preferences.ts";
import type { SecretsPort } from "../ports/secrets.ts";
import type { SettingsPort } from "../ports/settings.ts";

/** The keychain name a secret variable lives under; the Netlify token keeps the name the Netlify adapter reads. */
export const secretNameOf = (name: string) => (name === "NETLIFY_AUTH_TOKEN" ? "netlify-token" : name);

/** Settings over the settings store and the keychain: secrets never touch the store (ADR 0016). */
export function createPreferences(deps: { settings: SettingsPort; secrets: SecretsPort }): PreferencesPort {
  const { settings, secrets } = deps;
  const known = (name: string) => {
    const variable = envContract.find((candidate) => candidate.name === name);
    if (variable === undefined) throw new Error(`${name} is not a Tutors environment variable`);
    return variable;
  };
  return {
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
  };
}
