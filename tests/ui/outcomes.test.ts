import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import Outcomes from "../../src/ui/components/Outcomes.svelte";
import ItemOutcomes from "../../src/ui/components/ItemOutcomes.svelte";
import { coverage } from "../../src/domain/outcomes.ts";

const outcomes = [{ id: "LO1", text: "Students can explain how a web page is built", level: "Understand" as const }];

describe("outcomes on the course home", () => {
  it("adds an outcome and asks for the plan, keeping the ones already there", async () => {
    const onSave = vi.fn();
    render(Outcomes, { outcomes, coverage: null, onSave });
    await fireEvent.click(screen.getByRole("button", { name: "Add an outcome" }));
    await fireEvent.input(screen.getByLabelText("Outcome 2"), { target: { value: "Students can build a form" } });
    await fireEvent.click(screen.getByRole("button", { name: "Save outcomes" }));
    expect(onSave).toHaveBeenCalledWith([
      { id: "LO1", text: "Students can explain how a web page is built", level: "Understand" },
      { text: "Students can build a form", level: "Understand" },
    ]);
  });

  it("shows the coverage map with its flags", () => {
    const map = coverage(outcomes, [{ path: "w1", title: "Week 1", items: [{ path: "w1/t", kind: "talk", outcomes: ["LO1"] }] }]);
    render(Outcomes, { outcomes, coverage: map, onSave: vi.fn() });
    expect(screen.getByRole("region", { name: "Coverage map" })).toBeTruthy();
    expect(screen.getByText("Not yet practised")).toBeTruthy();
    expect(screen.getByRole("cell", { name: "Lecture" })).toBeTruthy();
  });

  it("shows no map for a course with no outcomes", () => {
    render(Outcomes, { outcomes: [], coverage: null, onSave: vi.fn() });
    expect(screen.queryByRole("region", { name: "Coverage map" })).toBeNull();
  });
});

describe("outcomes on an item", () => {
  it("tags a lab with the outcomes ticked", async () => {
    const onSave = vi.fn();
    render(ItemOutcomes, { outcomes, tagged: [], serves: "practises", onSave });
    expect(screen.getByRole("group", { name: "Outcomes this practises" })).toBeTruthy();
    await fireEvent.click(screen.getByRole("checkbox", { name: /explain how a web page is built/ }));
    await fireEvent.click(screen.getByRole("button", { name: "Save outcomes" }));
    expect(onSave).toHaveBeenCalledWith(["LO1"]);
  });
});
