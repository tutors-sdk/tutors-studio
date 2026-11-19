import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import Settings from "../../src/ui/components/Settings.svelte";
import { memoryCommandLine } from "../../src/adapters/command-line/memory/memory-command-line.ts";
import { MemorySettings } from "../../src/adapters/settings/memory/memory-settings.ts";
import { MemorySecrets } from "../../src/adapters/secrets/memory/memory-secrets.ts";
import { createPreferences } from "../../src/application/use-cases/preferences.ts";

const props = (advanced: boolean, commandLine = memoryCommandLine({ kind: "added", command: "/home/l/.local/bin/tutors-studio", on_path: true })) => ({
  preferences: createPreferences({ settings: new MemorySettings(), secrets: new MemorySecrets() }),
  appearance: { theme: "system", textSize: 0, reading: "default", motion: "system", contrast: "normal" } as never,
  onAppearance: vi.fn(),
  onClose: vi.fn(),
  advanced,
  onAdvanced: vi.fn(),
  companionHidden: false,
  onCompanionHidden: vi.fn(),
  commandLine,
});

describe("Settings, Advanced: the command line (STU-0208)", () => {
  it("adds the command when asked, and says where it is", async () => {
    const commandLine = memoryCommandLine({ kind: "added", command: "/home/l/.local/bin/tutors-studio", on_path: true });
    render(Settings, props(true, commandLine));
    await fireEvent.click(screen.getByRole("button", { name: "Add the command line to this computer" }));
    expect(commandLine.added).toBe(1);
    expect((await screen.findByRole("status")).textContent).toContain("The command is /home/l/.local/bin/tutors-studio.");
  });

  it("isn't offered with Advanced mode off", () => {
    render(Settings, props(false));
    expect(screen.queryByRole("button", { name: "Add the command line to this computer" })).toBeNull();
  });
});
