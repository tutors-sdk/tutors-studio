import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import TermView from "../../src/ui/components/TermView.svelte";
import ReleaseDate from "../../src/ui/components/ReleaseDate.svelte";
import RollOver from "../../src/ui/components/RollOver.svelte";
import { termOf } from "../../src/domain/term.ts";

const weeks = [
  { path: "w1", title: "Week 1" },
  { path: "w2", title: "Week 2" },
  { path: "w3", title: "Week 3" },
];

describe("the term on the course home", () => {
  it("says which week it is and offers the due week as the next action", async () => {
    const onShowDue = vi.fn();
    const term = termOf("2027-01-25", "2027-02-08", weeks, [
      { path: "w3", title: "Week 3", hidden: true, release: "2027-02-08" },
      { path: "w4", title: "Week 4", hidden: true, release: "2027-02-15" },
    ]);
    render(TermView, { term, today: "2027-02-08", onShowDue });
    expect(screen.getByText("This is week 3 of the term: Week 3.")).toBeTruthy();
    expect(screen.getByText("Week 3 is due out today.")).toBeTruthy();
    expect(screen.getByText("Week 4, due out 15 Feb 2027")).toBeTruthy();
    const show = screen.getByRole("button", { name: "Show Week 3 to students" });
    expect(show.classList.contains("primary")).toBe(true);
    await fireEvent.click(show);
    expect(onShowDue).toHaveBeenCalledWith("w3");
  });
});

describe("a week's release date", () => {
  it("asks for the plan that hides it until the day", async () => {
    const onSave = vi.fn();
    render(ReleaseDate, { kindWord: "week", release: null, onSave });
    await fireEvent.input(screen.getByLabelText(/Students see this week from/), { target: { value: "2027-02-15" } });
    await fireEvent.click(screen.getByRole("button", { name: "Keep it hidden until then" }));
    expect(onSave).toHaveBeenCalledWith("2027-02-15");
  });

  it("takes a date away", async () => {
    const onSave = vi.fn();
    render(ReleaseDate, { kindWord: "week", release: "2027-02-15", onSave });
    expect(screen.getByText("Hidden until 15 Feb 2027.")).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "Take the date away" }));
    expect(onSave).toHaveBeenCalledWith(null);
  });
});

describe("starting next year", () => {
  it("suggests next year's name and passes the first day", async () => {
    const onRollOver = vi.fn().mockResolvedValue(null);
    render(RollOver, { courseName: "Web Development 2026", onRollOver });
    expect((screen.getByLabelText("Next year's name") as HTMLInputElement).value).toBe("Web Development 2027");
    await fireEvent.input(screen.getByLabelText(/Teaching starts/), { target: { value: "2027-09-15" } });
    await fireEvent.click(screen.getByRole("button", { name: "Make next year's course" }));
    expect(onRollOver).toHaveBeenCalledWith({ name: "Web Development 2027", start: "2027-09-15" });
  });

  it("shows why next year's course wasn't made", async () => {
    render(RollOver, { courseName: "Web Development", onRollOver: vi.fn().mockResolvedValue("Nothing was created: the folder exists") });
    await fireEvent.click(screen.getByRole("button", { name: "Make next year's course" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
  });
});
