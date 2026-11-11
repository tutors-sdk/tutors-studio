import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import StartScreen from "../../src/ui/components/StartScreen.svelte";

describe("the start screen", () => {
  it("lists the recent courses and opens one by its folder", async () => {
    const onRecent = vi.fn();
    render(StartScreen, {
      onOpen: vi.fn(),
      onNew: vi.fn(),
      onRecent,
      recent: [
        { path: "/courses/mobile", name: "mobile" },
        { path: "/courses/web-dev", name: "web-dev" },
      ],
    });
    expect(screen.getByRole("heading", { name: "Your courses" })).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: /web-dev/ }));
    expect(onRecent).toHaveBeenCalledWith("/courses/web-dev");
  });

  it("says why a course didn't open", () => {
    render(StartScreen, { onOpen: vi.fn(), onNew: vi.fn(), notice: "Studio couldn't find mobile where it was, so it is off the list." });
    expect(screen.getByRole("status").textContent).toContain("couldn't find mobile");
  });

  it("forgets a course by its folder, and says its files stay", async () => {
    const onForget = vi.fn();
    render(StartScreen, {
      onOpen: vi.fn(),
      onNew: vi.fn(),
      onRecent: vi.fn(),
      onForget,
      recent: [
        { path: "/courses/mobile", name: "mobile" },
        { path: "/courses/web-dev", name: "web-dev" },
      ],
    });
    expect(screen.getByText(/Its folder and files stay where they are/)).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "Forget web-dev" }));
    expect(onForget).toHaveBeenCalledWith("/courses/web-dev");
  });

  it("offers to put back the course just forgotten", async () => {
    const onPutBack = vi.fn();
    render(StartScreen, { onOpen: vi.fn(), onNew: vi.fn(), notice: "Studio has forgotten web-dev. Its folder and files are where they were.", onPutBack });
    await fireEvent.click(screen.getByRole("button", { name: "Put it back" }));
    expect(onPutBack).toHaveBeenCalled();
  });

  it("shows no Forget button where courses can't be forgotten", () => {
    render(StartScreen, { onOpen: vi.fn(), onNew: vi.fn(), onRecent: vi.fn(), recent: [{ path: "/courses/mobile", name: "mobile" }] });
    expect(screen.queryByRole("button", { name: /Forget/ })).toBeNull();
  });
});
