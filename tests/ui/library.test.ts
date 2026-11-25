import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import Library from "../../src/ui/components/Library.svelte";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { memoryLibrary } from "../../src/adapters/library/memory/memory-library.ts";
import { MemorySettings } from "../../src/adapters/settings/memory/memory-settings.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { createLibrary } from "../../src/application/use-cases/library.ts";
import { planComposedCourse, type ComposeAnswers } from "../../src/application/use-cases/compose-course.ts";
import type { ComposePick } from "../../src/domain/compose.ts";

const ready = { "web/course.md": "# Web Development\n", "web/topic-01/topic.md": "# Week 1\n", "web/topic-01/note-01/note.md": "# Reading\n" };
const broken = { "old/course.md": "# Old Module\n", "old/topic-01/talk-01/talk.md": "# Loose\n" };

const port = memoryLibrary({ "/teaching": new MemoryFileSystem({ ...ready, ...broken }), "/more": new MemoryFileSystem({}) });
const screenOf = (folders: string[], create = vi.fn()) => ({
  shelf: createLibrary({ library: port, rules: courseRules, settings: new MemorySettings({ libraryFolders: folders }) }),
  preview: async (answers: ComposeAnswers, picks: ComposePick[]) => {
    const planned = await planComposedCourse({ library: port, rules: courseRules, newId: () => "p", today: () => "2026-11-25" }, answers, picks);
    return planned.ok ? { ok: true as const, summary: planned.compose.plan.summary, notes: planned.compose.notes } : planned;
  },
  create,
});
describe("the library screen", () => {
  it("lists the ready courses and those that need fixing, and opens one by its folder", async () => {
    const onOpen = vi.fn();
    render(Library, { library: screenOf(["/teaching"]), onOpen, onClose: vi.fn() });
    await waitFor(() => expect(screen.getByRole("heading", { name: "Ready to use (1)" })).toBeTruthy());
    expect(screen.getByRole("heading", { name: "Needs fixing (1)" })).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "Open Web Development" }));
    expect(onOpen).toHaveBeenCalledWith("/teaching/web");
  });

  it("adds a folder the lecturer chooses and takes one out", async () => {
    const choose = vi.fn().mockResolvedValue("/teaching");
    render(Library, { library: screenOf(["/more"]), choose, onOpen: vi.fn(), onClose: vi.fn() });
    await waitFor(() => expect(screen.getByText(/There are no Tutors courses in these folders yet/)).toBeTruthy());
    await fireEvent.click(screen.getByRole("button", { name: "Add a folder" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Ready to use (1)" })).toBeTruthy());
    await fireEvent.click(screen.getByRole("button", { name: "Take teaching out of your library" }));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Ready to use (1)" })).toBeNull());
  });

  it("picks a week, shows the plan that says it is a copy, and opens the course it makes", async () => {
    const opened = { name: "Mixed" };
    const create = vi.fn().mockResolvedValue(opened);
    const onOpen = vi.fn();
    render(Library, { library: screenOf(["/teaching"], create), onOpen, onClose: vi.fn() });
    await fireEvent.click(await screen.findByRole("button", { name: "Pick from Web Development" }));
    await fireEvent.click(screen.getByRole("button", { name: "Pick Week 1 from Web Development" }));
    expect(screen.getByText("Picked")).toBeTruthy();
    await fireEvent.input(screen.getByLabelText("Course name"), { target: { value: "Mixed" } });
    await fireEvent.click(screen.getByRole("button", { name: "See the plan" }));
    await waitFor(() => expect(screen.getByRole("dialog", { name: "Before anything changes" })).toBeTruthy());
    expect(screen.getByText(/Studio copies each item into your new course/)).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "Create course" }));
    await waitFor(() => expect(onOpen).toHaveBeenCalledWith(opened));
    expect(create.mock.calls[0][0]).toEqual({ name: "Mixed", lecturer: "", weeks: 1 });
  });

  it("says what to change before there is a plan, and takes a pick out", async () => {
    render(Library, { library: screenOf(["/teaching"]), onOpen: vi.fn(), onClose: vi.fn() });
    await fireEvent.click(await screen.findByRole("button", { name: "Pick from Web Development" }));
    await fireEvent.click(screen.getByRole("button", { name: "Pick Reading from Web Development" }));
    await fireEvent.click(screen.getByRole("button", { name: "See the plan" }));
    await waitFor(() => expect(screen.getByText("Give the course a name with at least one letter or number.")).toBeTruthy());
    await fireEvent.click(screen.getByRole("button", { name: "Take Reading out" }));
    expect(screen.queryByRole("heading", { name: "Your new course" })).toBeNull();
  });
});
