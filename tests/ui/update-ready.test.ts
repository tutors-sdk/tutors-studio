import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import UpdateReady from "../../src/ui/components/UpdateReady.svelte";
import { createUpdates, sessionUpdatePreferences } from "../../src/application/use-cases/updates.ts";
import type { UpdatesPort } from "../../src/application/ports/updates.ts";

function keeping(): ReturnType<typeof sessionUpdatePreferences> {
  const preferences = sessionUpdatePreferences();
  preferences.keepUpToDate.set(true);
  return preferences;
}

function port(download: UpdatesPort["download"]): UpdatesPort {
  return {
    version: async () => "0.1.0",
    check: async () => ({ kind: "newer", version: "0.2.0", notes: "", tutors: "17.2.0" }),
    download,
    install: vi.fn(async () => ({ ok: true as const })),
  };
}

describe("a newer Studio, offered when Studio opens", () => {
  it("offers Update now and Later, and Later puts it away", async () => {
    render(UpdateReady, { updates: createUpdates(port(vi.fn(async () => ({ ok: true as const }))), keeping()) });
    expect(await screen.findByRole("button", { name: "Update now" })).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "Later" }));
    expect(screen.queryByRole("button", { name: "Update now" })).toBeNull();
  });

  it("installs on Update now", async () => {
    const updates = port(vi.fn(async () => ({ ok: true as const })));
    render(UpdateReady, { updates: createUpdates(updates, keeping()) });
    await fireEvent.click(await screen.findByRole("button", { name: "Update now" }));
    await vi.waitFor(() => expect(updates.install).toHaveBeenCalledOnce());
  });

  it("discards an update whose signature doesn't match, and says so", async () => {
    const updates = port(vi.fn(async () => ({ ok: false as const, reason: "bad signature", unverified: true })));
    render(UpdateReady, { updates: createUpdates(updates, keeping()) });
    await fireEvent.click(await screen.findByRole("button", { name: "Update now" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Update now" })).toBeNull();
    expect(updates.install).not.toHaveBeenCalled();
  });

  it("asks at most once a day", async () => {
    const check = vi.fn(async () => ({ kind: "newer" as const, version: "0.2.0", notes: "" }));
    const preferences = sessionUpdatePreferences();
    const first = render(UpdateReady, { updates: createUpdates({ ...port(vi.fn()), check }, preferences) });
    await screen.findByRole("button", { name: "Update now" });
    first.unmount();
    render(UpdateReady, { updates: createUpdates({ ...port(vi.fn()), check }, preferences) });
    await Promise.resolve();
    expect(check).toHaveBeenCalledOnce();
  });
});
