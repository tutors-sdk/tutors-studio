import { invoke } from "@tauri-apps/api/core";

/** Listens on 127.0.0.1 for Google's sign-in redirect, through Studio's Rust side (src-tauri/src/oauth.rs, ADR 0064). */
export async function tauriLoopback(): Promise<{ redirectUri: string; query: Promise<string> }> {
  const port = await invoke<number>("oauth_loopback_start");
  return { redirectUri: `http://127.0.0.1:${port}`, query: invoke<string>("oauth_loopback_wait") };
}
