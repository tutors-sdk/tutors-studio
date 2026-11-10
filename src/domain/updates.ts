/**
 * What checking for a newer Studio finds (STU-0109 to STU-0111, ADR 0033). Nothing is downloaded or
 * installed until the lecturer accepts the offer.
 */
export type UpdateOffer =
  /** A build with no update key: updates come from the download page. */
  { kind: "unavailable" } | { kind: "current"; version: string } | { kind: "newer"; version: string; notes: string } | { kind: "failed"; reason: string };

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
      return `Studio ${offer.version} is ready. Studio downloads it, installs it and restarts; your courses and settings stay as they are.`;
    case "failed":
      return `Studio couldn't check for a newer version (${offer.reason}). Try again when you're online.`;
  }
}
