import { driveFolder, folderIdFromLink } from "../../domain/drive.ts";
import type { DriveAccountPort } from "../ports/drive.ts";

/** Google Drive folders for the library and registries (ADR 0064): the sign-in, and a pasted link made a library folder. */
export function createDrive(deps: { account: DriveAccountPort; open: (url: string) => void }) {
  const { account } = deps;
  return {
    signedIn: () => account.signedIn(),
    /** Whether this copy of Studio can sign in through the browser; without a Google client id, a token is pasted. */
    browser: account.browserSignIn !== undefined,
    signInInBrowser(): Promise<{ ok: true } | { ok: false; reason: string }> {
      if (account.browserSignIn === undefined) return Promise.resolve({ ok: false, reason: "This copy of Studio signs in to Google Drive with an access token." });
      return account.browserSignIn(deps.open);
    },
    signInWithToken: (token: string) => account.signIn(token),
    signOut: () => account.signOut(),
    /** The library folder for a pasted Drive folder link (STU-0279), or why it can't be one. */
    async folder(link: string): Promise<{ folder: string } | { reason: string }> {
      const id = folderIdFromLink(link);
      if (id === null) return { reason: "Paste the link of a Google Drive folder: in Drive, Share, then Copy link." };
      try {
        return { folder: driveFolder(id, await account.folderName(id)) };
      } catch (error) {
        return { reason: error instanceof Error ? error.message : String(error) };
      }
    },
  };
}

export type DriveLink = ReturnType<typeof createDrive>;
