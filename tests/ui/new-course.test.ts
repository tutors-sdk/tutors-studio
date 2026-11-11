import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import NewCourse from "../../src/ui/components/NewCourse.svelte";
import { checkAnswers } from "../../src/domain/new-course.ts";

const start = async () => {
  const onCreate = vi.fn().mockResolvedValue(null);
  render(NewCourse, { check: checkAnswers, onCreate, onCancel: vi.fn() });
  await fireEvent.input(screen.getByLabelText("Course name"), { target: { value: "Ethics" } });
  await fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  return onCreate;
};

describe("the New course screen", () => {
  it("creates a course from a picked template and length in two questions", async () => {
    const onCreate = await start();
    expect(screen.getByText("New course · 2 of 2")).toBeTruthy();
    await fireEvent.click(screen.getByRole("radio", { name: /Seminar and reading/ }));
    await fireEvent.click(screen.getByRole("radio", { name: "6" }));
    expect(screen.getByText(/2 sections, week 6 a review with a quiz/)).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "Create course" }));
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ name: "Ethics", template: "seminar", weeks: 6 }));
  });

  it("goes on to the week questions when the lecturer shapes their own week", async () => {
    const onCreate = await start();
    await fireEvent.click(screen.getByRole("radio", { name: /Shape my own week/ }));
    await fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { name: "How does a teaching week break down?" })).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "Create course" }));
    expect(onCreate.mock.calls[0][0].template).toBeUndefined();
  });
});
