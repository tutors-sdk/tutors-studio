import type { SecretsPort } from "../../../application/ports/secrets.ts";

/** Which environment variable holds each secret: the names the hosts' own CLIs read. */
const VARIABLES: Record<string, string> = { "netlify-token": "NETLIFY_AUTH_TOKEN" };

/** Secrets for the headless CLI from the environment, the way CI passes them. Setting one lasts for this run only. */
export class EnvSecrets implements SecretsPort {
  private readonly values = new Map<string, string>();
  constructor(private readonly env: Record<string, string | undefined>) {}
  async get(name: string): Promise<string | null> {
    const variable = VARIABLES[name];
    return this.values.get(name) ?? (variable === undefined ? null : (this.env[variable] ?? null));
  }
  async set(name: string, value: string): Promise<void> {
    this.values.set(name, value);
  }
}
