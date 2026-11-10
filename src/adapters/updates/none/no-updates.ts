import type { UpdatesPort } from "../../../application/ports/updates.ts";

/** The browser preview and the headless runner: nothing to update, so updates come from the download page. */
export const noUpdates = (version: string): UpdatesPort => ({
  version: async () => version,
  check: async () => ({ kind: "unavailable" }),
  install: async () => ({ ok: false, reason: "this copy of Studio can't update itself" }),
});
