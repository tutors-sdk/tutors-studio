import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import LibraryInTutors from "../../src/ui/components/LibraryInTutors.svelte";
import type { LibraryCourse } from "../../src/domain/library.ts";
import type { LibraryTutorsWatch } from "../../src/application/use-cases/library-tutors.ts";

const course = (title: string, group: LibraryCourse["group"] = "ready"): LibraryCourse => ({
  library: "/home/me/Teaching",
  path: title.toLowerCase(),
  title,
  group,
  errors: group === "ready" ? 0 : 1,
  warnings: 0,
  items: [],
});

describe("Library: your library in Tutors (STU-0316, STU-0318, STU-0319)", () => {
  it("builds the ready courses, says how it is going, and names a course that didn't build", async () => {
    let carryOn: () => void = () => {};
    const show = vi.fn(async (_: readonly LibraryCourse[], watch: LibraryTutorsWatch) => {
      watch.progress?.({ stage: "building", building: 1, of: 2, course: "Web" });
      await new Promise<void>((done) => (carryOn = done));
      return { ok: true as const, link: "http://127.0.0.1:8200/", shown: 1, unbuilt: [{ title: "Mobile", reason: "The Tutors generator stopped." }], stopped: false };
    });
    render(LibraryInTutors, { show, courses: [course("Web"), course("Mobile"), course("Old", "needs-fixing")] });
    expect(screen.getByText(/See the 2 ready courses in Tutors/)).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "Show your library in Tutors" }));
    expect(await screen.findByText("Building 1 of 2: Web…")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Stop building" })).toBeTruthy();
    carryOn();
    expect(await screen.findByText("Tutors lists 1 course from your library. 1 didn't build: each is named below.")).toBeTruthy();
    expect(screen.getByText("Mobile")).toBeTruthy();
    expect(screen.getByText("The Tutors generator stopped.")).toBeTruthy();
  });

  it("stops when the lecturer asks", async () => {
    let stopped = false;
    let carryOn: () => void = () => {};
    const show = vi.fn(async (_: readonly LibraryCourse[], watch: LibraryTutorsWatch) => {
      await new Promise<void>((done) => (carryOn = done));
      stopped = watch.stopped?.() ?? false;
      return { ok: true as const, link: "http://127.0.0.1:8200/", shown: 0, unbuilt: [], stopped };
    });
    render(LibraryInTutors, { show, courses: [course("Web")] });
    await fireEvent.click(screen.getByRole("button", { name: "Show your library in Tutors" }));
    await fireEvent.click(await screen.findByRole("button", { name: "Stop building" }));
    carryOn();
    expect(await screen.findByText(/You stopped Studio building your library/)).toBeTruthy();
    expect(stopped).toBe(true);
  });

  it("can't start with no ready course", () => {
    render(LibraryInTutors, { show: vi.fn(), courses: [course("Old", "needs-fixing")] });
    expect((screen.getByRole("button", { name: "Show your library in Tutors" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
