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

  it("shows an assistant's waiting plan as the next action, changing nothing until accepted (STU-0205, STU-0206)", async () => {
    const onAccept = vi.fn();
    const onDecline = vi.fn();
    const plan = { id: "plan-1", summary: "Fix the talk's name", ops: [{ op: "move" as const, from: "topic-01/talk-01 Intro", to: "topic-01/talk-01-intro" }] };
    render(Check, { ...props(true), agent: { allowed: true, set: vi.fn(), waiting: [{ id: "q-1", plan }], onAccept, onDecline } });
    expect(screen.getByText("Rename topic-01/talk-01 Intro to topic-01/talk-01-intro")).toBeTruthy();
    const accept = screen.getByRole("button", { name: "Accept this change" });
    expect(accept.className).toContain("primary");
    expect(screen.getByRole("button", { name: "Preview and publish" }).className).not.toContain("primary");
    await fireEvent.click(accept);
    expect(onAccept).toHaveBeenCalledWith("q-1");
    await fireEvent.click(screen.getByRole("button", { name: "Turn it down" }));
    expect(onDecline).toHaveBeenCalledWith("q-1");
  });

  it("has the lecturer's switch for an assistant on this computer (STU-0204)", async () => {
    const set = vi.fn();
    render(Check, { ...props(true), agent: { allowed: false, set, waiting: [], onAccept: vi.fn(), onDecline: vi.fn() } });
    const box = screen.getByRole("checkbox", { name: "Let an assistant on this computer work on this course" }) as HTMLInputElement;
    expect(box.checked).toBe(false);
    await fireEvent.click(box);
    expect(set).toHaveBeenCalledWith(true);
  });
});

describe("the assistant switches on Check and publish (STU-0306)", () => {
  const agent = () => ({ allowed: false, set: vi.fn(), waiting: [], onAccept: vi.fn(), onDecline: vi.fn() });
  const readPermission = () => ({ name: "Claude", allowed: false, set: vi.fn() });

  it("are left out outside Advanced mode", () => {
    render(Check, { ...props(true), agent: agent(), readPermission: readPermission(), assistants: false });
    expect(screen.queryByText(/Let Claude read this course/)).toBeNull();
    expect(screen.queryByText("Let an assistant on this computer work on this course")).toBeNull();
  });

  it("are offered in Advanced mode", () => {
    render(Check, { ...props(true), agent: agent(), readPermission: readPermission(), assistants: true });
    expect(screen.getByText(/Let Claude read this course/)).toBeTruthy();
    expect(screen.getByText("Let an assistant on this computer work on this course")).toBeTruthy();
  });
});
