/**
 * What checking for a newer Studio finds (STU-0109 to STU-0111, ADR 0033). Nothing is downloaded or
 * installed until the lecturer accepts the offer.
 */
export type UpdateOffer =
  /** A build with no update key: updates come from the download page. */
  | { kind: "unavailable" }
  | { kind: "current"; version: string }
  /** `tutors`: the Tutors release inside the newer Studio, when its update manifest names one (ADR 0046). */
  | { kind: "newer"; version: string; notes: string; tutors?: string | null }
  | { kind: "failed"; reason: string };

/** Where a copy of Studio looks for updates: Stable reads latest.json, Beta reads beta.json (ADR 0046). */
export type UpdateChannel = "stable" | "beta";

/** Studio asks for the latest version at most this often, when it opens (STU-0179). */
export const CHECK_EVERY_MS = 24 * 60 * 60 * 1000;

/** Whether a check is due when Studio opens: never checked, or the last check a day or more ago (or in the future, for a clock put back). */
export function checkDue(lastCheck: string | null, now: Date): boolean {
  if (lastCheck === null) return true;
  const last = Date.parse(lastCheck);
  return Number.isNaN(last) || last > now.getTime() || now.getTime() - last >= CHECK_EVERY_MS;
}

/** What the start screen and the course home say of a newer Studio (STU-0180). */
export const readyWords = (version: string, tutors?: string | null) => `Studio ${version} is ready${tutors ? `, with Tutors ${tutors} inside` : ""}.`;

/** What Studio says when an update would install while it changes a course or puts it online (STU-0181). */
export const BUSY_WORDS = "Studio is saving or changing your course, so it installed nothing yet. Press Update now again once that has finished.";

/** What Studio says when an update's signature does not match the key in the app (STU-0182). */
export const UNVERIFIED_WORDS = "Studio couldn't check that this update came from Tutors, so it threw it away and installed nothing. Studio is as it was.";

/** What Settings says this copy is: the Studio version and the Tutors release inside it (STU-0173). */
export const insideWords = (studioVersion: string, tutorsRelease: string) => `This is Studio ${studioVersion}, with Tutors ${tutorsRelease} inside.`;

/** Where every installer is, for a build that can't update itself. */
export const DOWNLOAD_PAGE = "https://github.com/tutors-sdk/tutors-studio/releases/latest";

/** The sentence Settings shows for an offer. */
export function offerWords(offer: UpdateOffer): string {
  switch (offer.kind) {
    case "unavailable":
      return "This copy of Studio can't update itself. Download the newest version from the release page and install it over this one; your courses and settings stay as they are.";
    case "current":
      return `Studio ${offer.version} is the newest version.`;
    case "newer":
      return `${readyWords(offer.version, offer.tutors)} Studio downloads it, installs it and restarts; your courses and settings stay as they are.`;
    case "failed":
      return `Studio couldn't check for a newer version (${offer.reason}). Try again when you're online.`;
  }
}
