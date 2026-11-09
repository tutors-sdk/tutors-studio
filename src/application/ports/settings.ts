import { defaultAppearance, type Appearance } from "../../domain/appearance.ts";

/** Driven port: typed per-user settings. SQLite in the app; never holds secrets, which go to the keychain (ADR 0016). */
export interface Settings {
  assistant: "none" | "ollama" | "anthropic" | "openai" | "google";
  assistantModel: string | null;
  companionHidden: boolean;
  /** Advanced mode: file names, the Tutors .env, the rules version and the markdown editor (ADR 0024). */
  advanced: boolean;
  /** Courses the lecturer has allowed a remote assistant to read, by root path (ADR 0006). */
  remoteOptIn: string[];
  recentCourses: string[];
  /** Light or dark, dyslexia mode and low-vision help (ADR 0020). */
  appearance: Appearance;
  /** Values the lecturer set for the Tutors .env's non-secret variables, by name; secret ones are in the keychain. */
}

export const defaultSettings: Settings = {
  assistant: "none",
  assistantModel: null,
  companionHidden: false,
  advanced: false,
  remoteOptIn: [],
  recentCourses: [],
  appearance: defaultAppearance,
};

export interface SettingsPort {
  get<K extends keyof Settings>(key: K): Promise<Settings[K]>;
  set<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void>;
}
