/** Driven port: a host that serves a built course to tutors.dev. Netlify first; the host only ever sees the built files. */
export interface BuiltFile {
  /** Path inside the built folder, without a leading slash: "tutors.json", "topic-01/talk-1/slides.pdf". */
  path: string;
  bytes: Uint8Array;
}

export type HostingOutcome = { ok: true; siteUrl: string; uploaded: number } | { ok: false; reason: string; detail: string };

export interface HostingPort {
  /** The host's name, for the lecturer: "Netlify". */
  readonly name: string;
  /** Whether a sign-in (an access token) is stored for this host. */
  signedIn(): Promise<boolean>;
  /** Keeps the access token in the OS keychain (ADR 0016) for later publishes. */
  signIn(token: string): Promise<void>;
  /** Publishes the built files as the site, creating the site the first time. */
  deploy(site: string, files: BuiltFile[]): Promise<HostingOutcome>;
}
