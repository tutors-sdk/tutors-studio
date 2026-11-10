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
});
