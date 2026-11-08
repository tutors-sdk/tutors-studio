import { invoke } from "@tauri-apps/api/core";
import type { SecretsPort } from "../../../application/ports/secrets.ts";

/** Secrets in the OS keychain (macOS Keychain, Windows Credential Manager, Secret Service) through Studio's Rust side (ADR 0016). */
export const tauriSecrets: SecretsPort = {
  get(name: string): Promise<string | null> {
    return invoke<string | null>("secret_get", { name });
  },
  set(name: string, value: string): Promise<void> {
    return invoke("secret_set", { name, value });
  },
};
