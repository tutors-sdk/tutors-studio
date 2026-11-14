import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import LiveTutors from "../../src/ui/components/LiveTutors.svelte";
import type { LiveTutorsPort } from "../../src/application/ports/live-tutors.ts";

const LINK = "http://localhost:5173/course/127.0.0.1:8190";

function live(folder: string | null, overrides: Partial<LiveTutorsPort> = {}): LiveTutorsPort {
  return {
    folder: vi.fn(async () => folder),
    choose: vi.fn(async () => ({ ok: true as const })),
    start: vi.fn(async (progress?: (step: string) => void) => {
      progress?.("Building the course with the Tutors generator");
      return { ok: true as const, link: LINK };
    }),
    changed: vi.fn(async () => ({ ok: true as const })),
    stop: vi.fn(async () => {}),
    live: false,
    link: null,
    ...overrides,
  };
}
const props = { link: null, problem: null, openLink: vi.fn() };

describe("Tutors on this computer, on the Publish screen", () => {
  it("asks for the lecturer's copy of Tutors first, and says why one was refused", async () => {
    const port = live(null, { choose: vi.fn(async () => ({ ok: false as const, reason: "This folder isn't a copy of Tutors.", detail: "" })) });
    render(LiveTutors, { ...props, live: port, choose: vi.fn(async () => "/home/me/notes"), onLive: vi.fn() });
    await fireEvent.click(await screen.findByRole("button", { name: "Choose your copy of Tutors…" }));
    expect(port.choose).toHaveBeenCalledWith("/home/me/notes");
    expect((await screen.findByRole("alert")).textContent).toContain("This folder isn't a copy of Tutors.");
  });

  it("shows the course in Tutors and hands the link to the app", async () => {
    const onLive = vi.fn();
    render(LiveTutors, { ...props, live: live("/home/me/tutors-mono-repo"), choose: vi.fn(), onLive });
    expect(await screen.findByText("Your copy of Tutors: /home/me/tutors-mono-repo")).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "Show it in Tutors" }));
    await waitFor(() => expect(onLive).toHaveBeenCalledWith(LINK));
  });

  it("while live, offers Stop and the browser, and names a change that didn't build", async () => {
    const port = live("/home/me/tutors-mono-repo");
    const onLive = vi.fn();
    render(LiveTutors, { ...props, link: LINK, problem: "Tutors still shows the last build.", live: port, choose: vi.fn(), onLive });
    expect(screen.getByRole("heading", { name: "Live in Tutors on this computer" })).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe("Tutors still shows the last build.");
    await fireEvent.click(screen.getByRole("button", { name: "Open it in your browser" }));
    expect(props.openLink).toHaveBeenCalledWith(LINK);
    await fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    await waitFor(() => expect(onLive).toHaveBeenCalledWith(null));
    expect(port.stop).toHaveBeenCalled();
  });
});
