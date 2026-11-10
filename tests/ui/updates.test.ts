import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import Updates from "../../src/ui/components/Updates.svelte";
import { createUpdates } from "../../src/application/use-cases/updates.ts";
import { noUpdates } from "../../src/adapters/updates/none/no-updates.ts";
import type { UpdatesPort } from "../../src/application/ports/updates.ts";

describe("updates in Settings", () => {
  it("offers a newer version and installs it only on the second press", async () => {
    const port: UpdatesPort = {
      version: async () => "0.1.0",
      check: async () => ({ kind: "newer", version: "0.2.0", notes: "" }),
      install: vi.fn(async () => ({ ok: true as const })),
    };
    render(Updates, { updates: createUpdates(port), openLink: vi.fn() });
    expect(await screen.findByText(/This is Studio 0.1.0/)).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "Check for a newer version" }));
    const install = await screen.findByRole("button", { name: "Install 0.2.0 and restart" });
    expect(port.install).not.toHaveBeenCalled();
    await fireEvent.click(install);
    expect(port.install).toHaveBeenCalledOnce();
  });

  it("links a copy that can't update itself to the download page", async () => {
    const openLink = vi.fn();
    render(Updates, { updates: createUpdates(noUpdates("0.1.0")), openLink });
    await fireEvent.click(screen.getByRole("button", { name: "Check for a newer version" }));
    await fireEvent.click(await screen.findByRole("button", { name: "Open the download page" }));
    expect(openLink).toHaveBeenCalledWith("https://github.com/tutors-sdk/tutors-studio/releases/latest");
  });
});
