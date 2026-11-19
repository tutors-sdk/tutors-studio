import { TUTORS_RELEASE } from "../../domain/bundle.ts";
import {
  BUSY_WORDS,
  checkDue,
  productionAheadWords,
  DOWNLOAD_PAGE,
  insideWords,
  offerWords,
  readyWords,
  UNVERIFIED_WORDS,
  type UpdateChannel,
  type UpdateOffer,
} from "../../domain/updates.ts";
import { studioBusy } from "../busy.ts";
import type { UpdatesPort } from "../ports/updates.ts";

export interface UpdateCheck {
  offer: UpdateOffer;
  words: string;
  /** The download page, for a copy of Studio that can't update itself. */
  link: string | null;
}

/** A newer Studio found when Studio opened, for the start screen and the course home (STU-0180). */
export interface ReadyUpdate {
  version: string;
  words: string;
}

export interface UpdatePreferences {
  /** When Studio last asked for the latest version (ISO time), or null. */
  lastCheck: { get(): Promise<string | null>; set(at: string): Promise<void> };
  channel: { get(): Promise<UpdateChannel>; set(channel: UpdateChannel): Promise<void> };
  /** "Keep Studio up to date": download in the background and install when Studio closes. Off by default. */
  keepUpToDate: { get(): Promise<boolean>; set(on: boolean): Promise<void> };
}

/** Preferences kept for this session only: Stable, never checked, not kept up to date. */
export function sessionUpdatePreferences(): UpdatePreferences {
  let last: string | null = null;
  let channel: UpdateChannel = "stable";
  let keep = false;
  return {
    lastCheck: { get: async () => last, set: async (at) => void (last = at) },
    channel: { get: async () => channel, set: async (to) => void (channel = to) },
    keepUpToDate: { get: async () => keep, set: async (on) => void (keep = on) },
  };
}

/**
 * Studio's updates (STU-0109 to STU-0111, STU-0179 to STU-0182, ADR 0046). Settings checks when asked; Studio
 * also checks when it opens, at most once a day, and downloads nothing until the lecturer says Update now, or
 * they turned on Keep Studio up to date. Nothing installs while Studio is changing a course or putting it online.
 */
export function createUpdates(port: UpdatesPort, preferences: UpdatePreferences = sessionUpdatePreferences(), now: () => Date = () => new Date(), busy = () => studioBusy.now) {
  let offer: UpdateOffer | null = null;
  /** The offered version, downloaded and verified. */
  let downloaded = false;

  const fail = (result: { ok: false; reason: string; unverified?: boolean }) => {
    if (result.unverified) {
      offer = null;
      downloaded = false;
      return { ok: false as const, reason: UNVERIFIED_WORDS, discarded: true };
    }
    return { ok: false as const, reason: `The new version wasn't installed: ${result.reason}. Studio is as it was.` };
  };

  const fetchOffer = async (progress?: (fraction: number) => void) => {
    if (downloaded) return { ok: true as const };
    const got = await port.download(progress);
    if (got.ok) downloaded = true;
    return got;
  };

  return {
    version: () => port.version(),
    channel: () => preferences.channel.get(),
    setChannel: (channel: UpdateChannel) => preferences.channel.set(channel),
    keepUpToDate: () => preferences.keepUpToDate.get(),
    setKeepUpToDate: (on: boolean) => preferences.keepUpToDate.set(on),
    /** "This is Studio 0.1.0, with Tutors 17.1.0 inside." (STU-0173) */
    inside: async () => insideWords(await port.version(), TUTORS_RELEASE),
    /** What to say beside the preview when tutors.dev runs a newer Tutors than the one inside (STU-0221). */
    productionAhead: async () => productionAheadWords(TUTORS_RELEASE, (await port.productionTutors?.()) ?? null),
    async check(): Promise<UpdateCheck> {
      offer = await port.check(await preferences.channel.get());
      downloaded = false;
      await preferences.lastCheck.set(now().toISOString());
      return { offer, words: offerWords(offer), link: offer.kind === "unavailable" ? DOWNLOAD_PAGE : null };
    },
    /**
     * When Studio opens (STU-0179): if a day has passed since the last check, asks for the latest version and
     * downloads nothing, unless Keep Studio up to date is on. A newer version comes back to offer.
     */
    async opening(): Promise<ReadyUpdate | null> {
      if (!checkDue(await preferences.lastCheck.get(), now())) return null;
      await preferences.lastCheck.set(now().toISOString());
      offer = await port.check(await preferences.channel.get());
      downloaded = false;
      if (offer.kind !== "newer") return null;
      const ready = { version: offer.version, words: readyWords(offer.version, offer.tutors) };
      if (await preferences.keepUpToDate.get()) await fetchOffer();
      return ready;
    },
    /** Update now: downloads and verifies the offer if it isn't already, installs it and restarts. */
    async accept(progress?: (fraction: number) => void): Promise<{ ok: true } | { ok: false; reason: string; discarded?: boolean }> {
      if (offer?.kind !== "newer") return { ok: false, reason: "Check for a newer version first." };
      if (busy()) return { ok: false, reason: BUSY_WORDS };
      const got = await fetchOffer(progress);
      if (!got.ok) return fail(got);
      if (busy()) return { ok: false, reason: BUSY_WORDS };
      const installed = await port.install(true);
      return installed.ok ? installed : fail(installed);
    },
    /** Heard as Studio closes: with Keep Studio up to date on, installs a downloaded update unless Studio is busy. */
    async closing(): Promise<void> {
      if (!downloaded || busy() || !(await preferences.keepUpToDate.get())) return;
      await port.install(false);
    },
  };
}

export type StudioUpdates = ReturnType<typeof createUpdates>;
