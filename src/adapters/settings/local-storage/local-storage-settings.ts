import { defaultSettings, type Settings, type SettingsPort } from "../../../application/ports/settings.ts";

const KEY = "tutors-studio.settings";

/**
 * Settings in the WebView's own storage, which persists per app in Tauri and per site in the browser
 * preview (ADR 0020). Never holds a secret (ADR 0016). A store that can't be read or written (a private
 * window) falls back to this session only.
 */
export class LocalStorageSettings implements SettingsPort {
  private values: Settings;

  constructor(private readonly storage: Pick<Storage, "getItem" | "setItem"> | null = globalThis.localStorage ?? null) {
    let stored: Partial<Settings> = {};
    try {
      stored = JSON.parse(this.storage?.getItem(KEY) ?? "{}") as Partial<Settings>;
    } catch {
      stored = {};
    }
    this.values = { ...defaultSettings, ...stored };
  }

  async get<K extends keyof Settings>(key: K): Promise<Settings[K]> {
    return this.values[key];
  }

  async set<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
    this.values = { ...this.values, [key]: value };
    try {
      this.storage?.setItem(KEY, JSON.stringify(this.values));
    } catch {
      // Storage refused (full, or a private window): the setting holds for this session.
    }
  }
}
