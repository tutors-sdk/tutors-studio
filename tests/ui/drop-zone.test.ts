import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import DropZone from "../../src/ui/components/DropZone.svelte";
import type { MaterialPlan } from "../../src/application/ports/authoring.ts";

const plan = { id: "p", summary: 'Add 1 item to "Week 1"', ops: [{ op: "write" as const, path: "topic-01/talk-01/Forms.pdf", content: new Uint8Array() }] };
const placed: MaterialPlan = { plan, placed: [{ title: "Forms", label: "Talk", folder: "topic-01/talk-01" }], tray: [] };
const files = [{ path: "Forms.pdf", bytes: new Uint8Array([37]) }];

describe("the drop zone (ADR 0038)", () => {
  it("adds files dropped on a week straight away, with nothing to press (STU-0147)", async () => {
    const onAccept = vi.fn();
    render(DropZone, { scope: "topic", where: "Week 1", onPlan: async () => placed, onAccept, incoming: files });
    await waitFor(() => expect(onAccept).toHaveBeenCalledWith(plan));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("says what went in and keeps only the tray when some files have no place", async () => {
    const onAccept = vi.fn();
    const tray = [{ path: "notes.xyz", reason: "no-week" as const, message: "Studio can't tell which week this is for." }];
    render(DropZone, { scope: "topic", where: "Week 1", onPlan: async () => ({ ...placed, tray }), onAccept, incoming: files });
    const dialog = await screen.findByRole("dialog", { name: "Some files need a place" });
    expect(onAccept).toHaveBeenCalledWith(plan);
    expect(dialog.textContent).toContain('Added "Forms" to Week 1.');
    expect(dialog.textContent).toContain("notes.xyz");
    expect(screen.queryByRole("button", { name: /^Add/ })).toBeNull();
    await fireEvent.click(screen.getByRole("button", { name: "Close" }));
  });

  it("still shows the plan for a drop on the whole course", async () => {
    const onAccept = vi.fn();
    render(DropZone, { scope: "course", where: "the course", onPlan: async () => placed, onAccept, incoming: files });
    await screen.findByRole("dialog", { name: "Before anything changes" });
    expect(onAccept).not.toHaveBeenCalled();
  });
});
