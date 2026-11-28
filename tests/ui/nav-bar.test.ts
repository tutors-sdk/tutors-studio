import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import NavBar from "../../src/ui/components/NavBar.svelte";

describe("Back and Home on every screen (STU-0325)", () => {
  it("goes back and home from the buttons and the keyboard", async () => {
    const onBack = vi.fn();
    const onHome = vi.fn();
    render(NavBar, { canBack: true, onBack, onHome });
    await fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    await fireEvent.click(screen.getByRole("button", { name: /Home/ }));
    await fireEvent.keyDown(window, { key: "ArrowLeft", altKey: true });
    await fireEvent.keyDown(window, { key: "Home", altKey: true });
    expect(onBack).toHaveBeenCalledTimes(2);
    expect(onHome).toHaveBeenCalledTimes(2);
  });

  it("can go nowhere from the start screen", async () => {
    const onBack = vi.fn();
    render(NavBar, { canBack: false, onBack, onHome: vi.fn() });
    expect((screen.getByRole("button", { name: /Back/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("button", { name: /Home/ }).getAttribute("aria-current")).toBe("page");
    await fireEvent.keyDown(window, { key: "ArrowLeft", altKey: true });
    expect(onBack).not.toHaveBeenCalled();
  });
});
