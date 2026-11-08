/** Driven port: typed per-user settings. SQLite in the app; never holds secrets, which go to the keychain (ADR 0016). */
export interface Settings {
  assistant: "none" | "ollama" | "anthropic" | "openai" | "google";
  assistantModel: string | null;
  companionHidden: boolean;
  /** Courses the lecturer has allowed a remote assistant to read, by root path (ADR 0006). */
  remoteOptIn: string[];
  recentCourses: string[];
}

export const defaultSettings: Settings = { assistant: "none", assistantModel: null, companionHidden: false, remoteOptIn: [], recentCourses: [] };

export interface SettingsPort {
  get<K extends keyof Settings>(key: K): Promise<Settings[K]>;
  set<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void>;
}
