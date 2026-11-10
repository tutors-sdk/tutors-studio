import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import LabSteps from "../../src/ui/components/LabSteps.svelte";

const steps = [
  { file: "01.Setup.md", number: 1, title: "Setup" },
  { file: "02.Grid.md", number: 2, title: "Grid" },
];

describe("a lab's steps panel", () => {
  it("asks to move, rename and add steps, and can't move the first earlier", async () => {
    const onChange = vi.fn();
    render(LabSteps, { steps, onChange });
    expect((screen.getByRole("button", { name: "Move Setup earlier" }) as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.click(screen.getByRole("button", { name: "Move Grid earlier" }));
    expect(onChange).toHaveBeenLastCalledWith({ do: "move", file: "02.Grid.md", by: -1 });
    await fireEvent.click(screen.getByRole("button", { name: "Rename Grid" }));
    await fireEvent.input(screen.getByLabelText("New title for Grid"), { target: { value: "CSS grid" } });
    await fireEvent.click(screen.getByRole("button", { name: "Rename" }));
    expect(onChange).toHaveBeenLastCalledWith({ do: "retitle", file: "02.Grid.md", title: "CSS grid" });
    await fireEvent.input(screen.getByLabelText("New step"), { target: { value: "Flex box" } });
    await fireEvent.click(screen.getByRole("button", { name: "Add the step" }));
    expect(onChange).toHaveBeenLastCalledWith({ do: "add", title: "Flex box" });
  });
});
