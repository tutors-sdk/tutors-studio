import { describe, expect, it, vi } from "vitest";
import { createEvent, fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import NodeDetail from "../../src/ui/components/NodeDetail.svelte";
import { DRAGGED } from "../../src/ui/dragging.ts";
import type { MapNode } from "../../src/domain/course-map.ts";
import type { Finding } from "../../src/domain/finding.ts";

const labels: Record<string, string> = { talk: "Talk", lab: "Lab", topic: "Topic", course: "Course" };
const node = (path: string, kind: string | null, title: string | null, children: MapNode[] = [], extra: Partial<MapNode> = {}): MapNode => ({
  path,
  name: path.slice(path.lastIndexOf("/") + 1),
  title,
  kind,
  label: kind === null ? null : (labels[kind] ?? kind),
  unpublished: false,
  excluded: false,
  status: "ok",
  findings: [],
  children,
  ...extra,
});

const week = node("topic-01", "topic", "Week 1", [
  node("topic-01/talk-01-html", "talk", "HTML"),
  node("topic-01/talk-02-css", "talk", "CSS"),
  node("topic-01/lab-01-x", "lab", "Setup"),
]);
const course = node("", "course", "Web Development", [week, node("topic-02", "topic", "Week 2")]);

/** A drag over a row at a height: jsdom has no DragEvent, so the pointer's height is set on the event by hand. */
async function dragOverAt(row: HTMLElement, dataTransfer: object, clientY: number) {
  const event = createEvent.dragOver(row, { dataTransfer });
  Object.defineProperty(event, "clientY", { value: clientY });
  await fireEvent(row, event);
}

function arrange(overrides: Record<string, unknown> = {}) {
  return {
    root: course,
    places: [
      { path: "", title: "The top of the course" },
      { path: "topic-01", title: "Week 1" },
      { path: "topic-02", title: "Week 2" },
    ],
    proposal: null,
    onArrange: vi.fn(),
    onAccept: vi.fn(),
    onCancel: vi.fn(),
    onPropose: vi.fn(),
    details: vi.fn(async () => ({ title: "Web Development", credits: "Leigh", start: null, weeks: 2 })),
    planDetails: vi.fn(async () => ({ ok: false as const, message: "" })),
    cardPicture: vi.fn(async () => ({ kind: "picture" as const, name: "topic.png" })),
    planPicture: vi.fn(async () => ({ ok: false as const, message: "" })),
    ...overrides,
  };
}

const base = { pending: null, onFix: vi.fn(), onAccept: vi.fn(), onCancel: vi.fn() };

describe("the week screen", () => {
  it("lists what students will see and opens an item", async () => {
    const onSelect = vi.fn();
    render(NodeDetail, { ...base, node: week, onSelect });
    expect(screen.getByRole("heading", { name: "What students will see" })).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: /CSS/ }));
    expect(onSelect).toHaveBeenCalledWith("topic-01/talk-02-css");
  });

  it("moves an item earlier or later among its kind from the keyboard", async () => {
    const plans = arrange();
    render(NodeDetail, { ...base, node: week, onSelect: vi.fn(), arrange: plans });
    expect((screen.getByRole("button", { name: "Move HTML earlier" }) as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.click(screen.getByRole("button", { name: "Move HTML later" }));
    expect(plans.onArrange).toHaveBeenCalledWith({ action: "reorder", folder: "topic-01", order: ["talk-02-css", "talk-01-html"] });
    // The only lab has no neighbour, so it has no buttons.
    expect(screen.queryByRole("button", { name: "Move Setup later" })).toBeNull();
  });

  it("plans a new order when one item is dropped above or below another (STU-0144)", async () => {
    const plans = arrange();
    render(NodeDetail, { ...base, node: week, onSelect: vi.fn(), arrange: plans });
    const html = screen.getByRole("button", { name: /^Talk\s*HTML/ });
    const css = screen.getByRole("button", { name: /^Talk\s*CSS/ });
    const dataTransfer = { types: [DRAGGED], getData: () => "", setData: vi.fn(), effectAllowed: "" };
    // Above the first lecture's middle: the second goes before it, and the row shows a line above.
    await fireEvent.dragStart(css, { dataTransfer });
    await dragOverAt(html.closest("li")!, dataTransfer, -1);
    expect(html.closest("li")!.classList.contains("before")).toBe(true);
    await fireEvent.drop(html.closest("li")!, { dataTransfer });
    expect(plans.onArrange).toHaveBeenCalledWith({ action: "reorder", folder: "topic-01", order: ["talk-02-css", "talk-01-html"] });
    // Below the second lecture's middle: the first goes after it.
    await fireEvent.dragStart(html, { dataTransfer });
    await dragOverAt(css.closest("li")!, dataTransfer, 1);
    await fireEvent.drop(css.closest("li")!, { dataTransfer });
    expect(plans.onArrange).toHaveBeenLastCalledWith({ action: "reorder", folder: "topic-01", order: ["talk-02-css", "talk-01-html"] });
  });

  it("ignores a drop of files from the desktop", async () => {
    const plans = arrange();
    render(NodeDetail, { ...base, node: week, onSelect: vi.fn(), arrange: plans });
    const target = screen.getByRole("button", { name: /^Talk\s*HTML/ }).closest("li")!;
    await fireEvent.drop(target, { dataTransfer: { types: ["Files"], getData: () => "" } });
    expect(plans.onArrange).not.toHaveBeenCalled();
  });

  it("renames and moves the item it shows", async () => {
    const plans = arrange();
    const talk = week.children[0];
    render(NodeDetail, { ...base, node: talk, onSelect: vi.fn(), arrange: plans });
    await fireEvent.input(screen.getByLabelText("New title"), { target: { value: "HTML basics" } });
    await fireEvent.click(screen.getByRole("button", { name: "Rename" }));
    expect(plans.onArrange).toHaveBeenCalledWith({ action: "retitle", item: "topic-01/talk-01-html", title: "HTML basics" });
    await fireEvent.change(screen.getByLabelText("Move to"), { target: { value: "topic-02" } });
    await fireEvent.click(screen.getByRole("button", { name: "Move" }));
    expect(plans.onArrange).toHaveBeenCalledWith({ action: "move", item: "topic-01/talk-01-html", into: "topic-02" });
    await fireEvent.click(screen.getByRole("button", { name: "Remove to the bin" }));
    expect(plans.onArrange).toHaveBeenCalledWith({ action: "remove", item: "topic-01/talk-01-html" });
    // Only a week at the top of the course can be hidden.
    expect(screen.queryByRole("button", { name: "Hide from students" })).toBeNull();
  });

  it("names the card's picture and never draws it", async () => {
    render(NodeDetail, { ...base, node: week, onSelect: vi.fn(), arrange: arrange() });
    await waitFor(() => expect(screen.getByText("topic.png")).toBeTruthy());
    expect(document.querySelector("img")).toBeNull();
  });
});

describe("the plan dialog", () => {
  it("shows an arrangement's plan and its notes, and nothing changes until it is accepted", async () => {
    const plans = arrange({ proposal: { summary: 'Move "CSS" to "Week 2"', notes: ["A page links to this folder."] } });
    render(NodeDetail, { ...base, node: week, onSelect: vi.fn(), arrange: plans });
    const dialog = screen.getByRole("dialog", { name: "Before anything changes" });
    expect(dialog.textContent).toContain('Move "CSS" to "Week 2". Nothing is deleted, and this can be put back from Changes.');
    expect(dialog.textContent).toContain("A page links to this folder.");
    expect(plans.onAccept).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByRole("button", { name: "Make this change" }));
    expect(plans.onAccept).toHaveBeenCalledOnce();
    await fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(plans.onCancel).toHaveBeenCalledOnce();
  });

  it("offers a finding's fix as a plan, in plain words unless Advanced mode is on", async () => {
    const finding: Finding = { rule: "V002", severity: "error", path: "Week 3", message: "Tutors won't publish this folder.", suggestedName: "topic-03" };
    const onFix = vi.fn();
    const onAccept = vi.fn();
    const broken = node("Week 3", null, null, [], { findings: [finding], status: "error", unpublished: true, excluded: true });
    const plan = { id: "p", summary: "Rename Week 3 to topic-03", ops: [{ op: "move" as const, from: "Week 3", to: "topic-03" }] };
    const { rerender } = render(NodeDetail, { ...base, node: broken, onFix, onAccept, pending: null });
    await fireEvent.click(screen.getByRole("button", { name: "Fix this" }));
    expect(onFix).toHaveBeenCalledWith(finding);
    await rerender({ pending: plan });
    expect(screen.getByRole("dialog").textContent).toContain("Studio will rename this so Tutors can publish it.");
    await fireEvent.click(screen.getByRole("button", { name: "Make this change" }));
    expect(onAccept).toHaveBeenCalledOnce();
    await rerender({ showFileNames: true });
    expect(screen.getByRole("dialog").textContent).toContain("Rename Week 3 to topic-03.");
  });
});

describe("course home", () => {
  it("asks for a plan of the course details", async () => {
    const plans = arrange();
    render(NodeDetail, { ...base, node: course, onSelect: vi.fn(), arrange: plans });
    const credits = await screen.findByLabelText("Who it's by");
    expect((screen.getByRole("button", { name: "Save details" }) as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.input(credits, { target: { value: "Leigh Griffin" } });
    await fireEvent.click(screen.getByRole("button", { name: "Save details" }));
    expect(plans.planDetails).toHaveBeenCalledWith({ title: "Web Development", credits: "Leigh Griffin", start: null });
    expect(plans.onPropose).toHaveBeenCalledOnce();
  });
});
