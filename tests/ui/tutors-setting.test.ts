import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import TutorsSetting from "../../src/ui/components/TutorsSetting.svelte";
import type { LiveTutorsPort } from "../../src/application/ports/live-tutors.ts";
import { TUTORS_RELEASE } from "../../src/domain/bundle.ts";

function tutors(folder: string | null, inside = true): LiveTutorsPort {
  let chosen = folder;
  return {
    folder: vi.fn(async () => chosen),
    ownAllowed: vi.fn(async () => true),
    choose: vi.fn(async (picked: string) => ((chosen = picked), { ok: true as const })),
    forget: vi.fn(async () => void (chosen = null)),
    inside,
    home: vi.fn(async () => ({ ok: true as const, link: "http://127.0.0.1:8200/" })),
    start: vi.fn(),
    changed: vi.fn(),
    stop: vi.fn(async () => {}),
    live: false,
    link: null,
  } as unknown as LiveTutorsPort;
}

describe("Settings, Advanced: Tutors on this computer (STU-0314, STU-0315)", () => {
  it("says which Tutors is in use, starts it on its home page and stops it", async () => {
    const port = tutors(null);
    render(TutorsSetting, { tutors: port, choose: vi.fn() });
    expect((await screen.findByText(new RegExp(`The Tutors inside Studio \\(Tutors ${TUTORS_RELEASE.replaceAll(".", "\\.")}\\)`))).getAttribute("role")).toBe("status");
    await fireEvent.click(screen.getByRole("button", { name: "Start Tutors" }));
    expect(await screen.findByText(/Running at http:\/\/127\.0\.0\.1:8200\//)).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "Stop Tutors" }));
    expect(port.stop).toHaveBeenCalled();
    expect(await screen.findByRole("button", { name: "Start Tutors" })).toBeTruthy();
  });

  it("switches to a developer copy, stopping the Tutors that runs, and back", async () => {
    const port = tutors(null);
    render(TutorsSetting, { tutors: port, choose: vi.fn(async () => "/home/me/tutors-mono-repo") });
    await fireEvent.click(await screen.findByRole("button", { name: "Start Tutors" }));
    await screen.findByRole("button", { name: "Stop Tutors" });
    await fireEvent.click(screen.getByRole("button", { name: "Choose your copy of Tutors…" }));
    expect(await screen.findByText(/Your own copy of Tutors, at \/home\/me\/tutors-mono-repo/)).toBeTruthy();
    expect(port.stop).toHaveBeenCalled();
    await fireEvent.click(screen.getByRole("button", { name: "Use the Tutors inside Studio" }));
    expect(await screen.findByText(/The Tutors inside Studio/)).toBeTruthy();
  });
});
