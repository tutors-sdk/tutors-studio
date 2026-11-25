/**
 * Driven port: the lecturer's Google account, for library folders and registries on Google Drive (ADR 0064).
 * The token stays in the keychain (ADR 0016). Reads and writes go through the LibraryPort and RegistryPort.
 */
export interface DriveAccountPort {
  /** Whether a sign-in is stored. */
  signedIn(): Promise<boolean>;
  /** Keeps a pasted access token, for a build with no Google client id. */
  signIn(token: string): Promise<void>;
  /** Forgets the sign-in. */
  signOut(): Promise<void>;
  /** Signs in through Google's own page in the browser; absent in a build with no Google client id. */
  browserSignIn?(open: (url: string) => void): Promise<{ ok: true } | { ok: false; reason: string }>;
  /** A Drive folder's name, to show in the library; throws when Studio can't open it. */
  folderName(id: string): Promise<string>;
}
