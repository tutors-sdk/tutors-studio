import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import Check from "../../src/ui/components/Check.svelte";

const props = (canPublish: boolean, onPublish = vi.fn()) => ({
  findings: [],
  advanced: false,
  placeOf: (path: string) => path,
  handOff: null,
  onPlanFixAll: vi.fn(async () => null),
  onApply: vi.fn(),
  onSelect: vi.fn(),
  onPublish,
  onClose: vi.fn(),
  canPublish,
});

describe("the Check and publish screen", () => {
  it("goes on to publish a course that checks out, as the next action (STU-0186)", async () => {
    const onPublish = vi.fn();
    render(Check, props(true, onPublish));
    const button = screen.getByRole("button", { name: "Preview and publish" });
    expect(button.className).toContain("primary");
    await fireEvent.click(button);
    expect(onPublish).toHaveBeenCalledOnce();
  });

  it("offers no publishing where the course can't be published (the browser preview)", () => {
    render(Check, props(false));
    expect(screen.queryByRole("button", { name: "Preview and publish" })).toBeNull();
  });
});
