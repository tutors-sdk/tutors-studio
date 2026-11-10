import type { HostingPort } from "../ports/hosting.ts";

/** Netlify's sign-in, kept in Settings beside the assistant's key (feature 16, STU-0114, STU-0115). Keys stay in the keychain (ADR 0016). */
export function createAccounts(deps: { hosting: HostingPort; open: (url: string) => void }) {
  const { hosting } = deps;
  return {
    async host(): Promise<{ name: string; signedIn: boolean; browser: boolean }> {
      return { name: hosting.name, signedIn: await hosting.signedIn(), browser: hosting.browserSignIn !== undefined };
    },
    /** Opens the host's own sign-in page in the browser and waits for the lecturer to approve Studio. */
    signInInBrowser(): Promise<{ ok: true } | { ok: false; reason: string }> {
      if (hosting.browserSignIn === undefined) return Promise.resolve({ ok: false, reason: `This copy of Studio signs in to ${hosting.name} with an access token.` });
      return hosting.browserSignIn(deps.open);
    },
    signInWithToken: (token: string) => hosting.signIn(token),
    signOut: () => hosting.signOut(),
  };
}

export type Accounts = ReturnType<typeof createAccounts>;
