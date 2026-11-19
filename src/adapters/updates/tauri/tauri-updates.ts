import { Channel, invoke } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import { getVersion } from "@tauri-apps/api/app";
import type { UpdatesPort } from "../../../application/ports/updates.ts";
import { checkDue, PRODUCTION_VERSION, type UpdateOffer } from "../../../domain/updates.ts";

const reasonOf = (error: unknown) => (error instanceof Error ? error.message : String(error));
/** The Rust side says this when the build carries no update key (lib.rs, ADR 0033). */
const UNAVAILABLE = "unavailable";
/** Tauri's updater checks each download against the key in the app; its errors name the signature when that fails. */
const unverified = (reason: string) => /signature|minisign/i.test(reason);

/** The last answer from tutors.dev, kept so Studio asks at most once a day (STU-0221). */
const PRODUCTION_KEY = "studio.production-tutors";

/** tutors.dev's reader answers its build identity at /version; Rust makes the request (plugin-http), so CORS doesn't apply. */
async function askProduction(): Promise<string | null> {
  let kept: { at: string; version: string | null } | null = null;
  try {
    kept = JSON.parse(localStorage.getItem(PRODUCTION_KEY) ?? "null");
  } catch {
    kept = null;
  }
  if (kept && !checkDue(kept.at, new Date())) return kept.version;
  let version: string | null = null;
  try {
    const { fetch } = await import("@tauri-apps/plugin-http");
    const answer = await fetch(PRODUCTION_VERSION, { headers: { accept: "application/json" }, connectTimeout: 10_000 });
    const body = answer.ok ? ((await answer.json()) as { version?: unknown }) : null;
    version = typeof body?.version === "string" ? body.version : null;
  } catch {
    version = null;
  }
  try {
    localStorage.setItem(PRODUCTION_KEY, JSON.stringify({ at: new Date().toISOString(), version }));
  } catch {
    // Not kept: Studio asks again next time.
  }
  return version;
}

type Found = { version: string; notes: string; tutors: string | null } | null;

/**
 * Tauri's updater through Studio's Rust commands (src-tauri/src/updates.rs, ADR 0046): the channel's manifest
 * (latest.json for Stable, beta.json for Beta), each download checked against the key the build carries.
 */
export function tauriUpdates(): UpdatesPort {
  return {
    version: getVersion,
    async check(channel): Promise<UpdateOffer> {
      try {
        const found = await invoke<Found>("update_check", { channel });
        if (found === null) return { kind: "current", version: await getVersion() };
        return { kind: "newer", version: found.version, notes: found.notes, tutors: found.tutors };
      } catch (error) {
        const reason = reasonOf(error);
        return reason === UNAVAILABLE ? { kind: "unavailable" } : { kind: "failed", reason };
      }
    },
    async download(progress) {
      const heard = new Channel<number>();
      heard.onmessage = (fraction) => progress?.(fraction);
      try {
        await invoke("update_download", { progress: heard });
        return { ok: true };
      } catch (error) {
        const reason = reasonOf(error);
        return { ok: false, reason, unverified: unverified(reason) };
      }
    },
    productionTutors: askProduction,
    async install(restart) {
      try {
        await invoke("update_install");
        if (restart) await relaunch();
        return { ok: true };
      } catch (error) {
        return { ok: false, reason: reasonOf(error) };
      }
    },
  };
}
