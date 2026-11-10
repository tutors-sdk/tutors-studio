import { describe, expect, it, vi } from "vitest";
import { createEvent, fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import Contents from "../../src/ui/components/Contents.svelte";
import { DRAGGED } from "../../src/ui/dragging.ts";
import type { MapNode } from "../../src/domain/course-map.ts";

const node = (path: string, kind: string | null, title: string | null, children: MapNode[] = []): MapNode => ({
  path,
  name: path.slice(path.lastIndexOf("/") + 1),
  title,
  kind,
  label: kind,
  unpublished: false,
  excluded: false,
  status: "ok",
  findings: [],
  children,
});
const course = node("", "course", "Web Development", [
  node("topic-01", "topic", "Week 1", [node("topic-01/talk-01-html", "talk", "HTML")]),
  node("topic-02", "topic", "Week 2"),
  node("topic-03", "topic", "Week 3"),
]);
const row = (title: string) => screen.getByRole("button", { name: new RegExp(`^${title}`) }).closest("li")!;
async function dragOverAt(target: HTMLElement, dataTransfer: object, clientY: number) {
  const event = createEvent.dragOver(target, { dataTransfer });
  Object.defineProperty(event, "clientY", { value: clientY });
  await fireEvent(target, event);
}

describe("the contents", () => {
  it("puts a week above or below another, never inside it (STU-0144, STU-0145)", async () => {
    const onArrange = vi.fn();
    render(Contents, { map: course, selected: "", showFileNames: false, onSelect: vi.fn(), onArrange });
    const dataTransfer = { types: [DRAGGED], getData: () => "", setData: vi.fn(), effectAllowed: "" };
    await fireEvent.dragStart(screen.getByRole("button", { name: /^Week 3/ }), { dataTransfer });
    await dragOverAt(row("Week 1"), dataTransfer, -1);
    expect(row("Week 1").classList.contains("before")).toBe(true);
    expect(row("Week 1").classList.contains("target")).toBe(false);
    await fireEvent.drop(row("Week 1"), { dataTransfer });
    expect(onArrange).toHaveBeenCalledWith({ action: "reorder", folder: "", order: ["topic-03", "topic-01", "topic-02"] });
  });

  it("plans files from the computer dropped on a week for that week (STU-0146)", async () => {
    const onFiles = vi.fn();
    render(Contents, { map: course, selected: "", showFileNames: false, onSelect: vi.fn(), onArrange: vi.fn(), onFiles });
    const file = new File(["%PDF"], "Forms.pdf");
    const dataTransfer = { types: ["Files"], files: [file], items: [], getData: () => "" };
    await fireEvent.dragOver(row("Week 2"), { dataTransfer });
    expect(row("Week 2").classList.contains("target")).toBe(true);
    await fireEvent.drop(row("Week 2"), { dataTransfer });
    await waitFor(() => expect(onFiles).toHaveBeenCalledWith("topic-02", [expect.objectContaining({ path: "Forms.pdf" })]));
  });
});
