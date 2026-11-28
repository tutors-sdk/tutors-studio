import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import StatusBar from "../../src/ui/components/StatusBar.svelte";

describe("the status bar in Advanced mode (STU-0308)", () => {
  it("says Advanced mode is on, and leads to Settings to turn it off", async () => {
    const onSettings = vi.fn();
    render(StatusBar, { rulesVersion: "1.2.3", assistantName: "Claude", onSettings });
    expect(screen.getByText("Advanced mode is on")).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "Turn it off in Settings" }));
    expect(onSettings).toHaveBeenCalled();
  });
});
