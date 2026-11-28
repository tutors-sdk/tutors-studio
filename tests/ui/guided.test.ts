import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import axe from "axe-core";
import NodeDetail from "../../src/ui/components/NodeDetail.svelte";
import Guide from "../../src/ui/components/Guide.svelte";
import type { MapNode } from "../../src/domain/course-map.ts";
import { guideSteps, type GuideWeek } from "../../src/domain/guided.ts";

const node = (path: string, kind: string, title: string, children: MapNode[] = []): MapNode => ({
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
const talk = node("topic-01/talk-01", "talk", "Week 1 lecture");
const lab = node("topic-01/lab-01", "lab", "Week 1 lab");
const week = node("topic-01", "topic", "Week 1", [talk, lab]);
const course = node("", "course", "Programming", [week]);

const arrange = (planUpload = vi.fn(async () => ({ ok: false as const, message: "" }))) => ({
  root: course,
  places: [],
  proposal: null,
  onArrange: vi.fn(),
  onAccept: vi.fn(),
  onCancel: vi.fn(),
  onPropose: vi.fn(),
  details: vi.fn(),
  planDetails: vi.fn(),
  cardPicture: vi.fn(async () => ({ kind: "usual" as const })),
  planPicture: vi.fn(),
  planUpload,
});
const base = { pending: null, onFix: vi.fn(), onAccept: vi.fn(), onCancel: vi.fn() };

async function violations(): Promise<string[]> {
  const result = await axe.run(document.body, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] }, rules: { "color-contrast": { enabled: false } } });
  return result.violations.map((violation) => `${violation.id}: ${violation.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

describe("an item's own upload (STU-0341)", () => {
  it("asks a talk for its slides as a PDF, and plans what the lecturer chooses", async () => {
    const planned = arrange();
    render(NodeDetail, { ...base, node: talk, arrange: planned });
    const button = screen.getByRole("button", { name: "Upload your slides (PDF)" });
    expect(button.className).toContain("primary");
    const input = button.parentElement!.querySelector("input[type=file]") as HTMLInputElement;
    expect(input.accept).toContain(".pdf");
    expect(input.multiple).toBe(false);
    const file = new File(["%PDF-1.7"], "slides.pdf", { type: "application/pdf" });
    await fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(planned.planUpload).toHaveBeenCalledWith("topic-01/talk-01", [expect.objectContaining({ path: "slides.pdf" })]));
    expect(planned.onPropose).toHaveBeenCalled();
    expect(await violations()).toEqual([]);
  });

  it("asks a lab for its content, several files at once", () => {
    render(NodeDetail, { ...base, node: lab, arrange: arrange() });
    const button = screen.getByRole("button", { name: "Upload your lab content" });
    expect((button.parentElement!.querySelector("input[type=file]") as HTMLInputElement).multiple).toBe(true);
  });

  it("offers no upload on a week", () => {
    render(NodeDetail, { ...base, node: week, arrange: arrange() });
    expect(screen.queryByRole("button", { name: /^Upload/ })).toBeNull();
  });
});

describe("the guide (STU-0349 to STU-0351)", () => {
  const weeks: GuideWeek[] = [
    {
      path: "topic-01",
      title: "Week 1",
      named: false,
      items: [
        { path: "topic-01/talk-01", kind: "talk", title: "Week 1 lecture", done: false },
        { path: "topic-01/lab-01", kind: "lab", title: "Week 1 lab", done: false },
      ],
    },
  ];
  const steps = guideSteps(weeks);
  const props = (at: number) => ({
    step: steps[at],
    progress: { done: 0, of: 3 },
    toDo: steps.slice(0, 3),
    first: at === 0,
    onTitle: vi.fn(),
    onSkip: vi.fn(),
    onBack: vi.fn(),
    onGoTo: vi.fn(),
    onCheck: vi.fn(),
    onLeave: vi.fn(),
  });

  it("asks what week 1 is about, and names it with the lecturer's title", async () => {
    const shown = props(0);
    render(Guide, shown);
    expect(screen.getByRole("heading", { name: "What is week 1 about?" })).toBeTruthy();
    expect(screen.getByText(/Week 1 · 0 of 3 done/)).toBeTruthy();
    await fireEvent.input(screen.getByLabelText("Week 1 title"), { target: { value: "Arrays and loops" } });
    await fireEvent.click(screen.getByRole("button", { name: "Use this title" }));
    expect(shown.onTitle).toHaveBeenCalledWith("Arrays and loops");
    await fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));
    expect(shown.onSkip).toHaveBeenCalled();
    expect(await violations()).toEqual([]);
  });

  it("ends with the check and the steps still to do", async () => {
    const shown = props(3);
    render(Guide, shown);
    expect(screen.getByRole("heading", { name: "Check your course" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Skip for now" })).toBeNull();
    await fireEvent.click(screen.getByRole("button", { name: "Week 1: Week 1 lab" }));
    expect(shown.onGoTo).toHaveBeenCalledWith(steps[2]);
    await fireEvent.click(screen.getByRole("button", { name: "Check the course" }));
    expect(shown.onCheck).toHaveBeenCalled();
    expect(await violations()).toEqual([]);
  });
});
