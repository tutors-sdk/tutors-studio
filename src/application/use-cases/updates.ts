import { DOWNLOAD_PAGE, offerWords, type UpdateOffer } from "../../domain/updates.ts";
import type { UpdatesPort } from "../ports/updates.ts";

export interface UpdateCheck {
  offer: UpdateOffer;
  words: string;
  /** The download page, for a copy of Studio that can't update itself. */
  link: string | null;
}

/** Checking for a newer Studio, and installing it only once the lecturer accepts (STU-0109 to STU-0111). */
export function createUpdates(port: UpdatesPort) {
  let offer: UpdateOffer | null = null;
  return {
    version: () => port.version(),
    async check(): Promise<UpdateCheck> {
      offer = await port.check();
      return { offer, words: offerWords(offer), link: offer.kind === "unavailable" ? DOWNLOAD_PAGE : null };
    },
    async accept(progress?: (fraction: number) => void): Promise<{ ok: true } | { ok: false; reason: string }> {
      if (offer?.kind !== "newer") return { ok: false, reason: "Check for a newer version first." };
      return port.install(progress);
    },
  };
}

export type StudioUpdates = ReturnType<typeof createUpdates>;
