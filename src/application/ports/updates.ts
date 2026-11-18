import type { UpdateChannel, UpdateOffer } from "../../domain/updates.ts";

/** A download or install that didn't happen; `unverified` when the update's signature didn't match the key in the app. */
export type UpdateFailure = { ok: false; reason: string; unverified?: boolean };

/**
 * Driven port: Studio's own updates (ADR 0033, amended by ADR 0046). Checking downloads nothing; `download`
 * fetches and verifies the offered version against the key in the app; `install` installs what was downloaded.
 */
export interface UpdatesPort {
  /** The version running now. */
  version(): Promise<string>;
  check(channel: UpdateChannel): Promise<UpdateOffer>;
  /** Downloads the offered version and checks its signature; a bad signature is discarded. */
  download(progress?: (fraction: number) => void): Promise<{ ok: true } | UpdateFailure>;
  /** Installs the downloaded version; with `restart`, Studio starts again on it. Resolves only when that fails. */
  install(restart: boolean): Promise<{ ok: true } | UpdateFailure>;
}
