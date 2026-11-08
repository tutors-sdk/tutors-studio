/** Driven port: secrets such as a Netlify access token. The OS keychain in the app (ADR 0016); never SettingsPort. */
export interface SecretsPort {
  get(name: string): Promise<string | null>;
  set(name: string, value: string): Promise<void>;
}
