import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import Publish from "../../src/ui/components/Publish.svelte";
import type { PublishingPort } from "../../src/application/ports/publishing.ts";

function publishing(overrides: Partial<PublishingPort> = {}): PublishingPort {
  return {
    save: vi.fn(async (progress?: (step: string) => void) => {
      progress?.("Checking the course");
      return { ok: true as const, added: ["netlify.toml"], warnings: 1 };
    }),
    host: vi.fn(async () => ({ name: "Netlify", signedIn: true })),
    signIn: vi.fn(async () => {}),
    saveWebsite: vi.fn(),
    publish: vi.fn(async () => ({ ok: true as const, siteUrl: "https://web-development.netlify.app", readerUrl: "https://tutors.dev/course/web-development", uploaded: 3 })),
    ...overrides,
  } as PublishingPort;
}
const props = { courseName: "Web Development", advanced: false, openLink: vi.fn(), onClose: vi.fn() };

describe("the publish screen", () => {
  it("says publishing needs the desktop app in the browser preview", () => {
    render(Publish, { ...props, publishing: null, errors: 0 });
    expect(screen.queryByRole("button", { name: "Save the course" })).toBeNull();
  });

  it("won't save a course with problems to fix", () => {
    render(Publish, { ...props, publishing: publishing(), errors: 2 });
    expect((screen.getByRole("button", { name: "Save the course" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("saves, says what it added, and tells the course map", async () => {
    const port = publishing();
    const onSaved = vi.fn();
    render(Publish, { ...props, publishing: port, errors: 0, onSaved });
    await fireEvent.click(screen.getByRole("button", { name: "Save the course" }));
    const result = await screen.findByRole("status");
    expect(result.textContent).toContain("Studio added the setup Tutors expects: netlify.toml.");
    expect(result.textContent).toContain("1 suggestion under Check");
    expect(onSaved).toHaveBeenCalledOnce();
  });

  it("asks for a Netlify sign-in before it can publish", async () => {
    const port = publishing({ host: vi.fn(async () => ({ name: "Netlify", signedIn: false })) });
    render(Publish, { ...props, publishing: port, errors: 0 });
    await waitFor(() => expect(screen.getByRole("button", { name: "Sign in" })).toBeTruthy());
    expect(screen.queryByLabelText(/address/i)).toBeNull();
  });

  it("publishes under a site name it checks, and links to where students read it", async () => {
    const port = publishing();
    const openLink = vi.fn();
    render(Publish, { ...props, publishing: port, errors: 0, openLink });
    const site = await screen.findByRole("textbox");
    await fireEvent.input(site, { target: { value: "Web Dev" } });
    expect(screen.getByText(/Use lower-case letters/)).toBeTruthy();
    await fireEvent.input(site, { target: { value: "web-development" } });
    const button = screen.getAllByRole("button").find((candidate) => candidate.textContent?.includes("ublish"))!;
    await fireEvent.click(button);
    expect(port.publish).toHaveBeenCalledWith("web-development", expect.any(Function));
    await fireEvent.click(await screen.findByRole("button", { name: "https://tutors.dev/course/web-development" }));
    expect(openLink).toHaveBeenCalledWith("https://tutors.dev/course/web-development");
  });
});
