import type { SecretsPort } from "../../../application/ports/secrets.ts";

/** Secrets held for the session only: the browser preview and the tests. */
export class MemorySecrets implements SecretsPort {
  private readonly values = new Map<string, string>();
  constructor(initial: Record<string, string> = {}) {
    for (const [name, value] of Object.entries(initial)) this.values.set(name, value);
  }
  async get(name: string): Promise<string | null> {
    return this.values.get(name) ?? null;
  }
  async set(name: string, value: string): Promise<void> {
    this.values.set(name, value);
  }
}
