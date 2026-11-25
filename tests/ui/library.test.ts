import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import Library from "../../src/ui/components/Library.svelte";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { memoryLibrary } from "../../src/adapters/library/memory/memory-library.ts";
import { MemorySettings } from "../../src/adapters/settings/memory/memory-settings.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { createLibrary } from "../../src/application/use-cases/library.ts";

const ready = { "web/course.md": "# Web Development\n", "web/topic-01/topic.md": "# Week 1\n", "web/topic-01/note-01/note.md": "# Reading\n" };
const broken = { "old/course.md": "# Old Module\n", "old/topic-01/talk-01/talk.md": "# Loose\n" };

const shelf = (folders: string[]) =>
  createLibrary({
    library: memoryLibrary({ "/teaching": new MemoryFileSystem({ ...ready, ...broken }), "/more": new MemoryFileSystem({}) }),
    rules: courseRules,
    settings: new MemorySettings({ libraryFolders: folders }),
  });

describe("the library screen", () => {
  it("lists the ready courses and those that need fixing, and opens one by its folder", async () => {
    const onOpen = vi.fn();
    render(Library, { shelf: shelf(["/teaching"]), onOpen, onClose: vi.fn() });
    await waitFor(() => expect(screen.getByRole("heading", { name: "Ready to use (1)" })).toBeTruthy());
    expect(screen.getByRole("heading", { name: "Needs fixing (1)" })).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "Open Web Development" }));
    expect(onOpen).toHaveBeenCalledWith("/teaching/web");
  });

  it("adds a folder the lecturer chooses and takes one out", async () => {
    const choose = vi.fn().mockResolvedValue("/teaching");
    render(Library, { shelf: shelf(["/more"]), choose, onOpen: vi.fn(), onClose: vi.fn() });
    await waitFor(() => expect(screen.getByText(/There are no Tutors courses in these folders yet/)).toBeTruthy());
    await fireEvent.click(screen.getByRole("button", { name: "Add a folder" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Ready to use (1)" })).toBeTruthy());
    await fireEvent.click(screen.getByRole("button", { name: "Take teaching out of your library" }));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Ready to use (1)" })).toBeNull());
  });
});
