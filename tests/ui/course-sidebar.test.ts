import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import CourseSidebar from "../../src/ui/components/CourseSidebar.svelte";
import type { MapNode } from "../../src/domain/course-map.ts";

const map: MapNode = {
  path: "",
  name: "web",
  title: "Web Development",
  kind: "course",
  label: "course",
  unpublished: false,
  excluded: false,
  status: "ok",
  findings: [],
  children: [],
};
const props = (
  tutors?: { onView: () => void; opening: string | null; failed: string | null },
  live: { line: string; updating: boolean; onOpen: () => void; onStop: () => void } | null = null,
) => ({
  title: "Web Development",
  errors: 0,
  map,
  selected: null,
  selectedNode: null,
  showFileNames: false,
  onSelect: vi.fn(),
  onArrange: vi.fn(),
  onFiles: vi.fn(),
  checkOpen: false,
  publishingOpen: false,
  historyOpen: false,
  onCheck: vi.fn(),
  onHistory: vi.fn(),
  onSettings: vi.fn(),
  onClose: vi.fn(),
  live,
  tutors,
});

describe("View my course in Tutors (STU-0312)", () => {
  it("is a button beside the contents that shows the course in Tutors", async () => {
    const onView = vi.fn();
    render(CourseSidebar, props({ onView, opening: null, failed: null }));
    await fireEvent.click(screen.getByRole("button", { name: "View my course in Tutors" }));
    expect(onView).toHaveBeenCalled();
  });

  it("says the step under way while it starts, and why it didn't", () => {
    render(CourseSidebar, props({ onView: vi.fn(), opening: "Building the course", failed: "Studio couldn't serve the course on this computer." }));
    expect((screen.getByRole("button", { name: "Building the course…" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("alert").textContent).toContain("couldn't serve");
  });

  it("isn't there where Studio can't show Tutors", () => {
    render(CourseSidebar, props());
    expect(screen.queryByRole("button", { name: "View my course in Tutors" })).toBeNull();
  });
});
