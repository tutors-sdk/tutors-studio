import { defaultSettings, type Settings, type SettingsPort } from "../../../application/ports/settings.ts";

/** Settings held for this session only. The SQLite adapter replaces it in a later milestone. */
export class MemorySettings implements SettingsPort {
  private readonly values: Settings;

  constructor(initial: Partial<Settings> = {}) {
    this.values = { ...defaultSettings, ...initial };
  }

  async get<K extends keyof Settings>(key: K): Promise<Settings[K]> {
    return this.values[key];
  }

  async set<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
    this.values[key] = value;
  }
}
