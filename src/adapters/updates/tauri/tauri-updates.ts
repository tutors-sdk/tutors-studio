import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { getVersion } from "@tauri-apps/api/app";
import type { UpdatesPort } from "../../../application/ports/updates.ts";
import type { UpdateOffer } from "../../../domain/updates.ts";

const reasonOf = (error: unknown) => (error instanceof Error ? error.message : String(error));
/** The updater plugin is registered only in a build that carries the update key (lib.rs, ADR 0033). */
const notRegistered = (error: unknown) => /plugin.*updater.*not found|updater.*not (?:initialized|found)/i.test(reasonOf(error));

/** Tauri's updater: the release's latest.json, signed with the key whose public half the build carries. */
export function tauriUpdates(): UpdatesPort {
  let offered: Update | null = null;
  return {
    version: getVersion,
    async check(): Promise<UpdateOffer> {
      try {
        offered = await check();
        if (offered === null) return { kind: "current", version: await getVersion() };
        return { kind: "newer", version: offered.version, notes: offered.body ?? "" };
      } catch (error) {
        return notRegistered(error) ? { kind: "unavailable" } : { kind: "failed", reason: reasonOf(error) };
      }
    },
    async install(progress) {
      if (offered === null) return { ok: false, reason: "there is no newer version to install" };
      let total = 0;
      let done = 0;
      try {
        await offered.downloadAndInstall((event) => {
          if (event.event === "Started") total = event.data.contentLength ?? 0;
          if (event.event === "Progress" && total > 0) progress?.(Math.min(1, (done += event.data.chunkLength) / total));
        });
        await relaunch();
        return { ok: true };
      } catch (error) {
        return { ok: false, reason: reasonOf(error) };
      }
    },
  };
}
