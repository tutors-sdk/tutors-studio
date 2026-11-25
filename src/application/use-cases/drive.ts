import { driveFolder, folderIdFromLink } from "../../domain/drive.ts";
import type { DriveAccountPort } from "../ports/drive.ts";

/** Google Drive folders for the library and registries (ADR 0064): the sign-in, and a pasted link made a library folder. */
export function createDrive(deps: { account: DriveAccountPort; open: (url: string) => void }) {
  const { account } = deps;
  return {
    signedIn: () => account.signedIn(),
    signIn(): Promise<{ ok: true } | { ok: false; reason: string }> {
      if (account.browserSignIn === undefined) return Promise.resolve({ ok: false, reason: "This copy of Studio can't sign in to Google." });
      return account.browserSignIn(deps.open);
    },
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

/**
 * Google Drive as the screens offer it (STU-0284): only when this copy of Studio carries its own Google client and
 * so signs in through the browser. A lecturer never pastes a token; that stays with the headless command.
 */
export function offeredDrive(deps: { account: DriveAccountPort; open: (url: string) => void }): DriveLink | undefined {
  return deps.account.browserSignIn === undefined ? undefined : createDrive(deps);
}
