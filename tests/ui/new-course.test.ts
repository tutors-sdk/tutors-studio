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
  it("offers a reference course from a list, one template and the lecturer's own week", async () => {
    await start();
    expect(screen.getAllByRole("radio").map((radio) => radio.closest("label")!.querySelector(".choice-name")!.textContent)).toEqual([
      "A reference course",
      "Lecture and lab",
      "Shape my own week",
    ]);
  });

  it("creates a course from the reference course picked in the list", async () => {
    const onCreate = await start();
    expect(screen.getByText("New course · 2 of 2")).toBeTruthy();
    await fireEvent.change(screen.getByLabelText("Reference course"), { target: { value: "agile-soft-dev" } });
    expect(screen.getByText(/13 weeks, 66 items, shaped on edeleastar\/module-agile-soft-dev-2013/)).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "Create course" }));
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ name: "Ethics", example: "agile-soft-dev" }));
  });

  it("creates a course from the template and a length in two questions", async () => {
    const onCreate = await start();
    await fireEvent.click(screen.getByRole("radio", { name: /Lecture and lab/ }));
    await fireEvent.click(screen.getByRole("radio", { name: "6" }));
    expect(screen.getByText(/2 sections, week 6 a review with a quiz/)).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "Create course" }));
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ name: "Ethics", template: "lecture-lab", weeks: 6 }));
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
