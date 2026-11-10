import type { UpdateOffer } from "../../domain/updates.ts";

/** Driven port: Studio's own updates (ADR 0033). Checking downloads nothing; `install` runs only on an offer the lecturer accepted. */
export interface UpdatesPort {
  /** The version running now. */
  version(): Promise<string>;
  check(): Promise<UpdateOffer>;
  /** Downloads and installs the offered version, then restarts Studio. Resolves with a reason only when that fails. */
  install(progress?: (fraction: number) => void): Promise<{ ok: false; reason: string } | { ok: true }>;
}
